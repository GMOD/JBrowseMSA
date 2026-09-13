#!/usr/bin/env bash
# Build a structural RNA alignment, tree and consensus structure for one Rfam
# family from bacterial genomes. Every step is the one shown in
# docs/tutorials/rna_family.md.
#
#   bash build_rna_family.sh [outdir]
#
# Needs: curl, python3, Infernal (cmsearch, cmalign) and FastTree on PATH.
#   apt install infernal fasttree     # Debian/Ubuntu
#   brew install infernal fasttree    # macOS
set -euo pipefail

OUT=${1:-.}
RFAM=RF00162
mkdir -p "$OUT"
cd "$OUT"

# Six Firmicute genomes, RefSeq accession and the four-letter row prefix. The
# S box regulon was described in Bacillus subtilis, and Caldanaerobacter
# subterraneus subsp. tengcongensis is the organism the SAM-I crystal structure
# (PDB 2GIS) came from.
GENOMES="NC_000964.3:Bsub NC_003869.1:Tten NC_003030.1:Cace NC_003210.1:Lmon NC_007795.1:Saur NC_009089.1:Cdif"
EUTILS=https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi

echo "== 1. the family: Rfam $RFAM covariance model and seed alignment"
[ -f $RFAM.cm ] || curl -sf -o $RFAM.cm "https://rfam.org/family/$RFAM/cm"
[ -f $RFAM.seed.sto ] ||
  curl -sf -o $RFAM.seed.sto "https://rfam.org/family/$RFAM/alignment/stockholm"
python3 - $RFAM.seed.sto <<'EOF'
import sys
gf = {}
names = set()
for line in open(sys.argv[1]):
    if line.startswith('#=GF'):
        _, k, v = line.split(None, 2)
        gf.setdefault(k, v.strip())
    elif line.strip() and line[0] not in '#/':
        names.add(line.split()[0])
print(f"  {gf['ID']} ({gf['AC']}): {gf['DE']}")
print(f'  seed alignment: {len(names)} sequences, built from {gf["SE"]}')
EOF

echo "== 2. genomes: RefSeq nucleotide records from NCBI"
mkdir -p genomes
for entry in $GENOMES; do
  acc=${entry%%:*}
  [ -f "genomes/$acc.fa" ] ||
    curl -sf "$EUTILS?db=nuccore&id=$acc&rettype=fasta&retmode=text" \
      -o "genomes/$acc.fa"
  head -1 "genomes/$acc.fa" | cut -c2- | cut -d, -f1 | sed 's/^/  /'
done
cat genomes/*.fa > all-genomes.fa

echo "== 3. search the genomes with the model"
# --cut_ga uses the family's own curated bit-score threshold, the one Rfam uses
# to decide what is a member. --noali keeps the hit alignments out of stdout;
# the table is what the next step reads
cmsearch --cut_ga --noali --cpu 4 --tblout hits.tbl $RFAM.cm all-genomes.fa \
  > cmsearch.out
grep -c '^[^#]' hits.tbl | xargs printf '  %s hits\n'
grep '^[^#]' hits.tbl | awk '{print $1}' | sort | uniq -c |
  awk '{printf "    %s  %s hits\n", $2, $1}'

echo "== 4. name each hit by the gene it sits in front of"
# A riboswitch is a leader sequence: the gene it controls is the first one
# downstream on the same strand. NCBI serves that as a feature table for any
# window of the record, so one request per hit names the row.
python3 - hits.tbl "$GENOMES" labels.tsv <<'EOF'
import re
import subprocess
import sys
import time

EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'
tbl, genomes, out = sys.argv[1], sys.argv[2], sys.argv[3]
prefix = dict(g.split(':') for g in genomes.split())


def feature_table(acc, start, stop, strand):
    url = (
        f'{EUTILS}?db=nuccore&id={acc}&seq_start={start}&seq_stop={stop}'
        f'&strand={strand}&rettype=ft&retmode=text'
    )
    return subprocess.run(['curl', '-sf', url], capture_output=True, text=True).stdout


def first_gene(ft):
    """gene symbol, locus tag and product of the first CDS read in this frame"""
    features, cur = [], None
    for line in ft.splitlines():
        m = re.match(r'^<?(\d+)\t>?(\d+)\t(\S+)', line)
        if m:
            cur = {'start': int(m[1]), 'end': int(m[2]), 'kind': m[3]}
            features.append(cur)
        elif cur is not None:
            q = line.strip().split('\t')
            if len(q) == 2:
                cur[q[0]] = q[1]
    for f in features:
        # start < end: same direction as the riboswitch, which is what makes it
        # the gene downstream of this leader rather than a neighbour behind it
        if f['kind'] == 'CDS' and f['start'] < f['end']:
            gene = next(
                (
                    g
                    for g in features
                    if g['kind'] == 'gene' and g['start'] == f['start']
                ),
                {},
            )
            name = gene.get('gene') or f.get('locus_tag') or gene.get('locus_tag')
            return name, f.get('product', '?')
    return None, None


seen = {}
with open(out, 'w') as fh:
    for line in open(tbl):
        if line.startswith('#'):
            continue
        f = line.split()
        acc, start, stop, strand = f[0], int(f[7]), int(f[8]), f[9]
        if strand == '+':
            ft = feature_table(acc, stop + 1, stop + 1500, 1)
        else:
            ft = feature_table(acc, max(1, stop - 1500), stop - 1, 2)
        gene, product = first_gene(ft)
        # no same-strand gene within 1500 nt: the hit is named by where it is
        name = f'{prefix[acc]}_{gene}' if gene else f'{prefix[acc]}_{start}'
        seen[name] = seen.get(name, 0) + 1
        if seen[name] > 1:
            name = f'{name}.{seen[name]}'
        fh.write(f'{name}\t{acc}\t{start}\t{stop}\t{gene or "-"}\t{product or "-"}\n')
        sys.stdout.flush()
        time.sleep(0.4)
EOF
awk -F'\t' '$5!="-"{named++}END{printf "  %d of %d hits named by a gene, %d with no same-strand gene within 1500 nt\n", named, NR, NR-named}' labels.tsv

echo "== 5. cut the hit sequences out of the genomes"
python3 - labels.tsv genomes hits.fa <<'EOF'
import sys

labels, genome_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
loaded = {}


def genome(acc):
    if acc not in loaded:
        parts = [
            line.strip()
            for line in open(f'{genome_dir}/{acc}.fa')
            if not line.startswith('>')
        ]
        loaded[acc] = ''.join(parts).upper()
    return loaded[acc]


complement = str.maketrans('ACGTN', 'TGCAN')
with open(out, 'w') as fh:
    for line in open(labels):
        name, acc, start, stop = line.split('\t')[:4]
        a, b = int(start), int(stop)
        seq = genome(acc)
        # cmsearch reports a minus-strand hit as start > stop
        hit = seq[a - 1 : b] if a <= b else seq[b - 1 : a].translate(complement)[::-1]
        fh.write(f'>{name}\n{hit}\n')
EOF
awk '/^>/{n++; next}
     {if(min==0||length($0)<min)min=length($0); if(length($0)>max)max=length($0)}
     END{printf "  %d sequences, %d-%d nt\n", n, min, max}' hits.fa

echo "== 6. align the hits to the model"
# every sequence is aligned to the same 108 consensus positions, so a column
# means the same thing in every row
cmalign --noprob -o cmalign.sto $RFAM.cm hits.fa > cmalign.out

echo "== 7. put the pseudoknot back"
# A covariance model is nested by construction: cmalign writes back the helices
# the model has and nothing else, so the pseudoknot Rfam annotates as A/a, the
# SAM contacts and the structural element names survive only in the seed. Both
# alignments mark consensus columns in #=GC RF, so the k-th consensus column of
# one is the k-th of the other.
python3 - $RFAM.seed.sto cmalign.sto annotated.sto <<'EOF'
import sys

seed_path, aln_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
COPY = ('SS_cons', 'RNA_structural_elements', 'RNA_ligand_SAM')


def read(path):
    gc, rows, order = {}, {}, []
    for line in open(path):
        line = line.rstrip('\n')
        if line.startswith('#=GC'):
            _, key, val = line.split(None, 2)
            gc[key] = gc.get(key, '') + val
        elif line and line[0] not in '#/':
            name, seq = line.split()
            if name not in rows:
                order.append(name)
            rows[name] = rows.get(name, '') + seq
    return gc, rows, order


seed_gc, _, _ = read(seed_path)
aln_gc, rows, order = read(aln_path)
seed_cols = [i for i, c in enumerate(seed_gc['RF']) if c not in '.~']
aln_cols = [i for i, c in enumerate(aln_gc['RF']) if c not in '.~']
if len(seed_cols) != len(aln_cols):
    sys.exit(f'consensus length differs: {len(seed_cols)} vs {len(aln_cols)}')

width = len(aln_gc['RF'])
copied = {}
for key in COPY:
    if key in seed_gc:
        line = ['.'] * width
        for k, col in enumerate(aln_cols):
            line[col] = seed_gc[key][seed_cols[k]]
        copied[key] = ''.join(line)

with open(out_path, 'w') as fh:
    fh.write('# STOCKHOLM 1.0\n')
    for name in order:
        fh.write(f'{name.ljust(26)} {rows[name]}\n')
    for key, val in copied.items():
        fh.write(f'#=GC {key.ljust(21)} {val}\n')
    fh.write(f'#=GC {"RF".ljust(21)} {aln_gc["RF"]}\n')
    fh.write('//\n')

pk = sum(1 for c in copied['SS_cons'] if c.isalpha() and c.isupper())
print(f'  {len(order)} rows x {width} columns, {len(aln_cols)} consensus columns')
print(f'  {pk} pseudoknot pairs copied from the seed')
EOF

echo "== 8. a tree from the alignment"
# FastTree reads aligned FASTA and knows DNA, so the Stockholm becomes one with
# U written as T and Rfam's insert gaps (.) as -
python3 - annotated.sto tree-input.afa <<'EOF'
import sys

rows, order = {}, []
for line in open(sys.argv[1]):
    line = line.rstrip('\n')
    if line and line[0] not in '#/':
        name, seq = line.split()
        if name not in rows:
            order.append(name)
        rows[name] = rows.get(name, '') + seq
with open(sys.argv[2], 'w') as fh:
    for name in order:
        seq = rows[name].upper().replace('U', 'T').replace('.', '-')
        fh.write(f'>{name}\n{seq}\n')
EOF
FastTree -nt -gtr -nosupport -quiet tree-input.afa > family.nwk 2> fasttree.log

echo "== 9. one Stockholm with the alignment, the structure and the tree"
python3 - annotated.sto family.nwk labels.tsv $RFAM sam-riboswitch.sto <<'EOF'
import sys

aln_path, tree_path, labels_path, acc, out_path = sys.argv[1:6]
tree = open(tree_path).read().split()
tree = ''.join(tree)
lines = [line.rstrip('\n') for line in open(aln_path)]
genes = {}
for line in open(labels_path):
    f = line.rstrip('\n').split('\t')
    genes[f[0]] = (f[1], f[2], f[3], f[5])

header = [
    '# STOCKHOLM 1.0',
    '#=GF ID SAM_six_genomes',
    '#=GF DE SAM-I (S box) riboswitches found by cmsearch in six Firmicute '
    'genomes and aligned to the Rfam model',
    f'#=GF SE Rfam {acc} covariance model and seed alignment',
    f'#=GF DR RFAM; {acc};',
    '#=GF CC Built by docs/tutorials/scripts/build_rna_family.sh. SS_cons, the '
    'SAM contacts and the element names are the Rfam seed consensus, copied '
    'onto the consensus columns of the cmalign output.',
    f'#=GF NH {tree}',
]
with open(out_path, 'w') as fh:
    for line in header:
        fh.write(line + '\n')
    for name, (record, start, stop, product) in genes.items():
        fh.write(f'#=GS {name.ljust(21)} DE {record}:{start}-{stop} {product}\n')
    for line in lines[1:]:
        fh.write(line + '\n')
print(f'  wrote {out_path}')
EOF

echo "== 10. read the structure back off the alignment"
python3 - sam-riboswitch.sto <<'EOF'
import random
import sys
from collections import Counter

PAIRABLE = {'AU', 'UA', 'GC', 'CG', 'GU', 'UG'}
CLOSE = {'>': '<', ')': '(', ']': '[', '}': '{'}


def read(path):
    gc, rows = {}, {}
    for line in open(path):
        line = line.rstrip('\n')
        if line.startswith('#=GC'):
            _, key, val = line.split(None, 2)
            gc[key] = gc.get(key, '') + val
        elif line and line[0] not in '#/':
            name, seq = line.split()
            rows[name] = rows.get(name, '') + seq
    return gc, rows


def base_pairs(ss):
    """the pairs a WUSS string encodes; a letter pair is a pseudoknot"""
    stacks, out = {}, []
    for i, c in enumerate(ss):
        if c in '<([{':
            stacks.setdefault(c, []).append(i)
        elif c in CLOSE:
            out.append((stacks[CLOSE[c]].pop(), i, False))
        elif c.isalpha() and c.isupper():
            stacks.setdefault(c, []).append(i)
        elif c.isalpha():
            out.append((stacks[c.upper()].pop(), i, True))
    return sorted(out)


gc, rows = read(sys.argv[1])
ss = gc['SS_cons']
pairs = base_pairs(ss)


def count(i, j):
    ok = n = 0
    for seq in rows.values():
        a, b = seq[i].upper().replace('T', 'U'), seq[j].upper().replace('T', 'U')
        if a in 'ACGU' and b in 'ACGU':
            n += 1
            ok += (a + b) in PAIRABLE
    return ok, n


nested = [p for p in pairs if not p[2]]
knot = [p for p in pairs if p[2]]
print(f'  {len(pairs)} base pairs: {len(nested)} nested, {len(knot)} pseudoknot')
for label, group in (('paired columns', pairs), ('pseudoknot only', knot)):
    ok = n = 0
    for i, j, _ in group:
        a, b = count(i, j)
        ok, n = ok + a, n + b
    print(f'  {label}: {ok}/{n} = {100 * ok / n:.1f}% can pair')

# the control: the same statistic over pairs of columns the structure says are
# not paired. Any two columns of a nucleotide alignment agree some of the time
paired_cols = {c for p in pairs for c in p[:2]}
unpaired = [
    i
    for i in range(len(ss))
    if i not in paired_cols
    and sum(1 for s in rows.values() if s[i] not in '.-') >= 0.8 * len(rows)
]
random.seed(42)
ok = n = 0
for _ in range(len(pairs) * 20):
    i, j = random.choice(unpaired), random.choice(unpaired)
    if i != j:
        a, b = count(i, j)
        ok, n = ok + a, n + b
print(f'  unpaired columns drawn at random: {ok}/{n} = {100 * ok / n:.1f}% can pair')

# how conserved a column is, as the share of rows carrying its commonest base.
# Complementarity and identity are different questions: a helix column can swap
# base freely as long as its partner swaps with it
contacts = [i for i, c in enumerate(gc.get('RNA_ligand_SAM', '')) if c == 'X']
occupied = [
    i
    for i in range(len(ss))
    if sum(1 for s in rows.values() if s[i] not in '.-') >= 0.8 * len(rows)
]


def identity(cols):
    out = []
    for i in cols:
        col = [s[i].upper().replace('T', 'U') for s in rows.values()]
        col = [c for c in col if c in 'ACGU']
        out.append(Counter(col).most_common(1)[0][1] / len(col))
    return sum(out) / len(out), len(out)


print(f'\n  SAM contact columns: {" ".join(str(i + 1) for i in contacts)}')
classes = (
    ('touch SAM', [i for i in occupied if i in contacts]),
    ('paired', [i for i in occupied if i in paired_cols and i not in contacts]),
    ('neither', [i for i in occupied if i not in paired_cols and i not in contacts]),
)
for label, cols in classes:
    mean, count_of = identity(cols)
    print(f'  {label:10s} {count_of:3d} columns, commonest base in {100 * mean:.1f}% of rows')

# Which column pairs best with each of the most variable columns, searched
# against every column rather than against the structure. A variable column
# that is in a helix should find its own partner
print('\n  the ten most variable columns, and the column each pairs best with:')
print('  col  commonest base   best partner   SS_cons pairs them with')
partner = {}
for i, j, _ in pairs:
    partner[i] = j
    partner[j] = i
variable = sorted(occupied, key=lambda i: identity([i])[0])[:10]
recovered = 0
for i in variable:
    best, best_at = 0, None
    for j in occupied:
        if j != i:
            ok, n = count(i, j)
            if n and ok / n > best:
                best, best_at = ok / n, j
    named = partner.get(i)
    recovered += best_at == named
    print(
        f'  {i + 1:3d}  {100 * identity([i])[0]:13.0f}%   {best_at + 1:5d} at {100 * best:3.0f}%'
        f'   {named + 1 if named is not None else "-":>5}'
    )
print(f'  {recovered} of {len(variable)} find the partner SS_cons names')

print('\n  every pair, as alignment columns (1-based):')
print('  cols        kind        can pair   base pairs seen')
for i, j, pk in pairs:
    ok, n = count(i, j)
    kinds = {}
    for seq in rows.values():
        a, b = seq[i].upper().replace('T', 'U'), seq[j].upper().replace('T', 'U')
        if a in 'ACGU' and b in 'ACGU':
            kinds[a + b] = kinds.get(a + b, 0) + 1
    seen = ' '.join(
        f'{k}:{v}' for k, v in sorted(kinds.items(), key=lambda kv: -kv[1])
    )
    kind = 'knot ' if pk else 'helix'
    sam = 'SAM' if i in contacts or j in contacts else '   '
    print(f'  {i + 1:3d} {j + 1:4d}   {kind} {sam}  {ok:3d}/{n:<3d}    {seen}')
EOF

echo
echo "wrote $OUT/sam-riboswitch.sto"
