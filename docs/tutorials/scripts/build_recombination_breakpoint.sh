#!/usr/bin/env bash
# Build the SARS-CoV-2 recombinant dataset of
# docs/tutorials/recombination_breakpoint.md: five whole genomes from GenBank,
# one alignment, one tree, a gene GFF projected onto every row, and a
# sliding-window scan of the XBB.1 row against each of its two parents. Every
# step is the one the page shows, and every number that page quotes is printed
# by a run of this script.
#
#   bash build_recombination_breakpoint.sh [rows.tsv] [outdir]
#
# Needs: curl, clustalw (apt install clustalw), python3 (standard library only).
# Writes the accession table itself if one is not supplied, so the script runs
# with no arguments.
set -euo pipefail

ROWS=${1:-recombinant-rows.tsv}
OUT=${2:-.}
mkdir -p "$OUT"

EFETCH=https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
SVIEWER=https://www.ncbi.nlm.nih.gov/sviewer/viewer.fcgi
REFERENCE=NC_045512.2

# One row per genome: the label the viewer draws, the GenBank accession, and
# the Pango lineage NCBI Virus assigns it. OQ859938.1 is the only complete
# BJ.1 genome in GenBank; the others are the longest N-free record their
# lineage filter returned.
if [ ! -f "$ROWS" ]; then
  echo "writing $ROWS (five SARS-CoV-2 genomes)"
  cat > "$ROWS" <<'EOF'
Wuhan-Hu-1	NC_045512.2	reference
BJ.1	OQ859938.1	BA.2.10.1.1
BM.1.1.1	OP911098.1	BA.2.75.3.1.1.1
XBB.1	PV014247.1	XBB.1
BA.5	PQ577962.1	BA.5
EOF
fi

# 1. one efetch for all five accessions, relabeled to the row names, which is
#    what the viewer draws down the side and what column 1 of the GFF matches
ids=$(awk -F'\t' '!/^#/ && NF {printf "%s%s", sep, $2; sep=","}' "$ROWS")
curl -sf "$EFETCH?db=nuccore&id=$ids&rettype=fasta&retmode=text" -o "$OUT/genomes-ncbi.fasta"
curl -sf "$SVIEWER?id=$REFERENCE&report=gff3&retmode=text" -o "$OUT/$REFERENCE.gff"

python3 - "$ROWS" "$OUT/genomes-ncbi.fasta" "$OUT/recombinant.fasta" <<'PY'
import sys

rows, fetched, out = sys.argv[1:4]

seqs, acc = {}, None
for line in open(fetched):
    if line.startswith('>'):
        acc = line[1:].split()[0]
        seqs[acc] = []
    elif acc:
        seqs[acc].append(line.strip())
seqs = {k: ''.join(v).upper() for k, v in seqs.items()}

with open(out, 'w') as fh:
    for line in open(rows):
        if line.startswith('#') or not line.strip():
            continue
        label, acc, lineage = line.rstrip('\n').split('\t')[:3]
        if acc not in seqs:
            raise SystemExit(f'efetch returned nothing for {acc}')
        seq = seqs[acc]
        fh.write(f'>{label}\n{seq}\n')
        print(f'  {label:12s} {acc:12s} {lineage:16s} {len(seq)} bp  {seq.count("N")} N')
PY

# 2. align, then infer a neighbor-joining tree from the alignment. Five whole
#    genomes take about four minutes. ClustalW wraps the Newick across lines,
#    and the viewer wants one string
clustalw -INFILE="$OUT/recombinant.fasta" -ALIGN -TYPE=DNA -OUTORDER=INPUT \
  -OUTPUT=FASTA -OUTFILE="$OUT/recombinant.afa" > /dev/null
clustalw -INFILE="$OUT/recombinant.afa" -TREE -TYPE=DNA -OUTPUTTREE=phylip > /dev/null
tr -d '[:space:]' < "$OUT/recombinant.ph" > "$OUT/recombinant.nwk"
rm -f "$OUT/recombinant.ph"
cat "$OUT/recombinant.nwk"
echo

# 3. the genes. RefSeq annotates NC_045512.2, and only that row: project each
#    gene through the alignment so every row carries the span in its own
#    coordinates, which is what the overlay draws and what the rows' indels
#    would otherwise shift.
python3 - "$OUT/recombinant.afa" "$OUT/$REFERENCE.gff" "$OUT/recombinant-genes.gff" <<'PY'
import sys

afa, ref_gff, out = sys.argv[1:4]
REF = 'Wuhan-Hu-1'
# the spike subregions the page marks, in reference nucleotides: the
# receptor-binding domain is spike residues 331-528 and the receptor-binding
# motif 438-506, both counted from the first base of the S CDS at 21563
S_START = 21563
SUBREGIONS = [('RBD', 331, 528, '%23e15759'), ('RBM', 438, 506, '%23b07aa1')]
GENE_COLOR = '%23bab0ac'
S_COLOR = '%234e79a7'

seqs, name = {}, None
for line in open(afa):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = []
    elif name:
        seqs[name].append(line.strip())
seqs = {k: ''.join(v) for k, v in seqs.items()}

# reference position (1-based) -> alignment column (0-based), and back again
# per row
col_of_ref = [i for i, c in enumerate(seqs[REF]) if c != '-']
pos_of_col = {}
for row, seq in seqs.items():
    pos, table = 0, {}
    for i, c in enumerate(seq):
        if c != '-':
            pos += 1
        table[i] = pos
    pos_of_col[row] = table

genes = []
for line in open(ref_gff):
    if line.startswith('#'):
        continue
    f = line.rstrip('\n').split('\t')
    if len(f) < 9 or f[2] != 'gene':
        continue
    attrs = dict(kv.split('=', 1) for kv in f[8].split(';') if '=' in kv)
    genes.append((attrs.get('Name', attrs.get('ID')), int(f[3]), int(f[4]), f[6]))
genes.sort(key=lambda g: g[1])
print(f'{len(genes)} genes in the {REF} annotation, '
      f'{genes[0][0]} at {genes[0][1]}-{genes[0][2]} through '
      f'{genes[-1][0]} at {genes[-1][1]}-{genes[-1][2]}')

spans = [(n, s, e, st, 'gene', S_COLOR if n == 'S' else GENE_COLOR)
         for n, s, e, st in genes]
for name, first, last, color in SUBREGIONS:
    spans.append((name, S_START + (first - 1) * 3, S_START + last * 3 - 1, '+',
                  'region', color))

with open(out, 'w') as g:
    g.write('##gff-version 3\n')
    for row in seqs:
        for name, start, end, strand, kind, color in spans:
            a = pos_of_col[row][col_of_ref[start - 1]]
            b = pos_of_col[row][col_of_ref[end - 1]]
            g.write(f'{row}\tRefSeq\t{kind}\t{a}\t{b}\t.\t{strand}\t.'
                    f'\tName={name};color={color}\n')
print(f'{len(spans)} spans per row over {len(seqs)} rows')
PY

# 4. the scan. Two rows differ at a column when both carry a base and the two
#    bases are not the same, and the scan counts those differences in a window
#    centered on every column of the alignment. One count per parent gives the
#    recombinant two curves, and the same scan runs for the control row, which
#    descends from neither parent.
python3 - "$OUT/recombinant.afa" "$OUT/recombinant-rbd.afa" "$OUT/recombinant-layers.json" <<'PY'
import json
import sys

afa, rbd_out, layers_out = sys.argv[1:4]
REF = 'Wuhan-Hu-1'
CHILD = 'XBB.1'
CONTROL = 'BA.5'
LEFT, RIGHT = 'BJ.1', 'BM.1.1.1'
COLORS = {LEFT: '#4e79a7', RIGHT: '#e15759'}
WINDOW = 200
FLANK = 2000
S_START, S_END = 21563, 25384
RBD_START, RBD_END = 22553, 23146  # spike residues 331-528
BASES = set('ACGT')

seqs, name = {}, None
for line in open(afa):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = []
    elif name:
        seqs[name].append(line.strip())
seqs = {k: ''.join(v) for k, v in seqs.items()}
ncol = len(seqs[REF])
col_of_ref = [i for i, c in enumerate(seqs[REF]) if c != '-']
ref_of_col = {c: i + 1 for i, c in enumerate(col_of_ref)}
print(f'{len(seqs)} rows, {ncol} alignment columns, '
      f'{len(col_of_ref)} of them a base of {REF}')
for row, seq in seqs.items():
    lead = len(seq) - len(seq.lstrip('-'))
    trail = len(seq) - len(seq.rstrip('-'))
    print(f'  {row:12s} {lead:3d} gap columns before its first base, {trail:3d} '
          f'after its last, {seq.strip("-").count("-"):3d} deleted in between')


def compare(a, b):
    """1 where the two rows differ, 0 where they match, None where either row
    carries a gap or an N."""
    x, y = seqs[a], seqs[b]
    return [None if x[i] not in BASES or y[i] not in BASES else int(x[i] != y[i])
            for i in range(ncol)]


def scan(diff):
    """Differences in a window of WINDOW columns centered on each column."""
    half = WINDOW // 2
    running = [0]
    for d in diff:
        running.append(running[-1] + (d or 0))
    return [running[min(ncol, i + half)] - running[max(0, i - half)]
            for i in range(ncol)]


pairs = {(q, p): compare(q, p) for q in (CHILD, CONTROL) for p in (LEFT, RIGHT)}
scans = {k: scan(v) for k, v in pairs.items()}
for (q, p), diff in pairs.items():
    n = sum(1 for d in diff if d is not None)
    d = sum(d for d in diff if d)
    print(f'{q:9s} against {p:9s} {d:3d} differences over {n} comparable '
          f'columns, {100 * (1 - d / n):.2f}% identity')

# 5. the informative sites: columns where the two parents differ from each
# other and the third row carries one parent's base. Each site votes for a
# parent. A recombinant's votes fall into a 5' block and a 3' block, so the
# split that puts the most votes on their own side is the breakpoint, and the
# interval between the two sites either side of it is how far the data pins it.
def informative(query):
    sites = []
    for i in range(ncol):
        a, b, c = seqs[LEFT][i], seqs[RIGHT][i], seqs[query][i]
        if a in BASES and b in BASES and c in BASES and a != b:
            if c == a:
                sites.append((i, LEFT))
            elif c == b:
                sites.append((i, RIGHT))
    return sites


def best_split(sites):
    """The split index whose left side votes LEFT and right side votes RIGHT
    for the most sites, and the number of sites that agree with it."""
    best, at = -1, 0
    for k in range(len(sites) + 1):
        score = (sum(1 for _, w in sites[:k] if w == LEFT)
                 + sum(1 for _, w in sites[k:] if w == RIGHT))
        if score > best:
            best, at = score, k
    return at, best


splits = {}
for query in (CHILD, CONTROL):
    sites = informative(query)
    at, score = best_split(sites)
    votes = {LEFT: sum(1 for _, w in sites if w == LEFT), RIGHT: len(sites) - sum(1 for _, w in sites if w == LEFT)}
    print(f'{query}: {len(sites)} informative sites, {votes[LEFT]} voting {LEFT} '
          f'and {votes[RIGHT]} voting {RIGHT}')
    print(f'{query}: the best split has {score} of the {len(sites)} sites on the '
          f'side it predicts, between {REF} {ref_of_col[sites[at - 1][0]]} and '
          f'{ref_of_col[sites[at][0]]}')
    off = [ref_of_col[i] for k, (i, w) in enumerate(sites)
           if (w == RIGHT) != (k >= at)]
    print(f'{query}: {len(off)} sites on the other side: '
          + ', '.join(str(p) for p in off))
    splits[query] = (sites, at)

sites, at = splits[CHILD]
start, end = ref_of_col[sites[at - 1][0]], ref_of_col[sites[at][0]]
print(f'the breakpoint interval is {REF} {start}-{end}, {end - start + 1} nt, '
      f'spike codons {(start - S_START) // 3 + 1} to {(end - S_START) // 3 + 1}')

# 6. where the two curves change places, read off the scan alone
def crossings(query, lo, hi):
    signs = []
    for i in range(lo, hi):
        d = scans[(query, LEFT)][i] - scans[(query, RIGHT)][i]
        if d:
            signs.append((i, 1 if d > 0 else -1))
    return [i for (i, s), (_, prev) in zip(signs[1:], signs) if s != prev]


lo, hi = col_of_ref[RBD_START - 1], col_of_ref[RBD_END - 1] + 1
crossed = {}
# the figures anchor a callout on the recombinant's crossing, so a row table
# whose window holds none says so here instead of failing on an empty list

for query in (CHILD, CONTROL):
    over = crossings(query, lo, hi)
    crossed[query] = over
    where = ', at ' + ', '.join(f'{REF} {ref_of_col[i]}' for i in over) if over else ''
    print(f'{query}: the lower of the two curves changes hands {len(over)} '
          f'time{"" if len(over) == 1 else "s"} across the receptor-binding '
          f'domain{where}')
if not crossed[CHILD]:
    raise SystemExit(f'the two curves never change places inside {RBD_START}-'
                     f'{RBD_END}, so that window holds no breakpoint to draw')

# 7. the receptor-binding domain, cut out of the alignment. A bar track holds
# one value per alignment column and a ?data= link holds several hundred of
# them, so the two curves travel over this window, and the tree file serves
# both alignments.
with open(rbd_out, 'w') as fh:
    for row, seq in seqs.items():
        fh.write(f'>{row}\n{seq[lo:hi]}\n')
print(f'the receptor-binding domain is columns {lo + 1}-{hi}, '
      f'{REF} {RBD_START}-{RBD_END}, {hi - lo} columns')

def ceiling(query):
    return max(max(scans[(query, p)][lo:hi]) for p in (LEFT, RIGHT))


def track(query, parent):
    return {
        'id': f'{query}-{parent}'.lower().replace('.', ''),
        'name': f'{query} vs {parent}',
        'kind': 'bar',
        'values': scans[(query, parent)][lo:hi],
        'max': ceiling(query),
        'color': COLORS[parent],
        'height': 70,
    }


first, last = col_of_ref[start - 1], col_of_ref[end - 1]
for query in (CHILD, CONTROL):
    print(f'{query}: the two counts reach {ceiling(query)} differences per '
          f'{WINDOW} columns inside the receptor-binding domain')
    for parent in (LEFT, RIGHT):
        values = scans[(query, parent)]
        side = (values[lo:first + 1], values[last:hi])
        print(f'  {query} vs {parent}: {min(side[0])} to {max(side[0])} left of '
              f'the break, {min(side[1])} to {max(side[1])} right of it')


layers = {
    'recombinantTracks': [track(CHILD, LEFT), track(CHILD, RIGHT)],
    'controlTracks': [track(CONTROL, LEFT), track(CONTROL, RIGHT)],
    'window': {
        'firstColumn': lo + 1,
        'lastColumn': hi,
        'referenceStart': RBD_START,
        'referenceEnd': RBD_END,
        'scanWidth': WINDOW,
    },
    # columns are 1-based, as the viewer's header counts them, and windowColumn
    # numbers the same base in the receptor-binding domain file
    'breakpoint': {
        'referenceStart': start,
        'referenceEnd': end,
        'firstColumn': first + 1,
        'lastColumn': last + 1,
        'firstWindowColumn': first - lo + 1,
        'lastWindowColumn': last - lo + 1,
        'crossingColumn': crossed[CHILD][0] + 1,
        'crossingWindowColumn': crossed[CHILD][0] - lo + 1,
        'crossingReference': ref_of_col[crossed[CHILD][0]],
    },
    'spike': {
        'referenceStart': S_START,
        'referenceEnd': S_END,
        'firstColumn': col_of_ref[S_START - 1] + 1,
        'lastColumn': col_of_ref[S_END - 1] + 1,
    },
    'rows': list(seqs),
}
json.dump(layers, open(layers_out, 'w'), indent=2)

# 8. check the curves against the raw columns: the differences between the
# recombinant and each parent in the 2 kb either side of the breakpoint, and
# the letters every row carries at the informative sites nearest the break.
mid = (col_of_ref[start - 1] + col_of_ref[end - 1]) // 2
for side, span in (('left of', range(max(0, mid - FLANK), mid)),
                   ('right of', range(mid, min(ncol, mid + FLANK)))):
    for parent in (LEFT, RIGHT):
        diff = pairs[(CHILD, parent)]
        n = sum(1 for i in span if diff[i] is not None)
        d = sum(diff[i] for i in span if diff[i] is not None)
        print(f'{FLANK} columns {side} the break: {CHILD} and {parent} differ '
              f'at {d} of the {n} columns where both carry a base')

print(f'{"position":>8}  ' + '  '.join(f'{r:>10}' for r in seqs))
for i, _ in sites[at - 3:at + 3]:
    print(f'{ref_of_col[i]:>8}  ' + '  '.join(f'{seqs[r][i]:>10}' for r in seqs))
PY

echo
echo "wrote $OUT/recombinant.afa, $OUT/recombinant.nwk, $OUT/recombinant-genes.gff, $OUT/recombinant-rbd.afa, $OUT/recombinant-layers.json"
