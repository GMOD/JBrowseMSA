#!/usr/bin/env bash
# Build one alignment, one tree and one gene GFF from a list of RefSeq
# mitochondrial genomes. Every step is the one shown in
# docs/tutorials/mitogenome_genes.md, and every number that page quotes is
# printed by a run of this script.
#
#   bash build_mitogenome_genes.sh [rows.tsv] [outdir]
#
# Needs: curl, clustalw (apt install clustalw), python3.
# Writes the accession list itself if one is not supplied, so the script runs
# with no arguments. The eight genomes it picks all keep the standard
# vertebrate gene order. Opossum (NC_006299.1) was in an earlier draft and is
# out: marsupials carry the WANCY rearrangement, so its tRNA-Trp, tRNA-Ala and
# tRNA-Cys sit in a different order from every other row.
set -euo pipefail

ROWS=${1:-mito-rows.tsv}
OUT=${2:-.}
mkdir -p "$OUT/raw"

if [ ! -f "$ROWS" ]; then
  echo "writing $ROWS (eight mammal mitochondrial genomes)"
  cat > "$ROWS" <<'EOF'
NC_012920.1	Human
NC_001643.1	Chimp
NC_005089.1	Mouse
NC_001665.2	Rat
NC_002008.4	Dog
NC_006853.1	Cow
NC_001640.1	Horse
NC_000891.1	Platypus
EOF
fi

# 1. the genome and its annotation, one request each. efetch serves the
#    sequence; the sviewer report serves RefSeq's own GFF3 for the accession
echo "fetching genomes and annotations"
while IFS=$'\t' read -r accession label; do
  case "$accession" in '#'* | '') continue ;; esac
  curl -sf "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=$accession&rettype=fasta&retmode=text" \
    -o "$OUT/raw/$accession.fa"
  curl -sf "https://www.ncbi.nlm.nih.gov/sviewer/viewer.fcgi?id=$accession&report=gff3&retmode=text" \
    -o "$OUT/raw/$accession.gff"
  bp=$(tail -n +2 "$OUT/raw/$accession.fa" | tr -d '\n' | wc -c)
  genes=$(awk -F'\t' '$3=="gene"' "$OUT/raw/$accession.gff" | wc -l)
  printf '  %-12s %-9s %6d bp  %2d genes\n' "$label" "$accession" "$bp" "$genes"
  sleep 0.4
done < "$ROWS"

# 2. one FASTA record per genome, named by the label, which is what the viewer
#    draws down the side and what column 1 of the gene GFF has to match
: > "$OUT/mito.fasta"
while IFS=$'\t' read -r accession label; do
  case "$accession" in '#'* | '') continue ;; esac
  printf '>%s\n' "$label" >> "$OUT/mito.fasta"
  tail -n +2 "$OUT/raw/$accession.fa" | tr -d '\n' >> "$OUT/mito.fasta"
  printf '\n' >> "$OUT/mito.fasta"
done < "$ROWS"

# 3. the same records right-padded to a common width, which is what the viewer
#    needs to open the genomes before they are aligned
python3 - "$OUT/mito.fasta" "$OUT/mito-unaligned.afa" <<'PY'
import sys

src, dest = sys.argv[1:3]
records, name = {}, None
for line in open(src):
    if line.startswith('>'):
        name = line[1:].strip()
        records[name] = ''
    else:
        records[name] += line.strip()
width = max(len(s) for s in records.values())
with open(dest, 'w') as out:
    for name, seq in records.items():
        print(f'>{name}\n{seq}{"-" * (width - len(seq))}', file=out)
print(f'  {len(records)} genomes padded to {width} columns')
PY

# 4. align. Eight whole mitogenomes take about three minutes
echo "aligning"
clustalw -INFILE="$OUT/mito.fasta" -ALIGN -TYPE=DNA \
  -OUTPUT=FASTA -OUTFILE="$OUT/mito.afa" | grep -E 'Alignment Score|lastres'

# 5. neighbor-joining tree from the alignment. ClustalW wraps the Newick across
#    lines; strip the whitespace so it is one string
clustalw -INFILE="$OUT/mito.afa" -TREE -TYPE=DNA -OUTPUTTREE=phylip > /dev/null
tr -d '[:space:]' < "$OUT/mito.ph" > "$OUT/mito.nwk"
cat "$OUT/mito.nwk"
echo

# 6. one GFF for the viewer: a gene per protein-coding gene, rRNA and tRNA,
#    named, stranded, and carrying the respiratory complex it belongs to
echo "deriving mito-genes.gff"
python3 - "$ROWS" "$OUT/raw" "$OUT/mito.fasta" "$OUT/mito-genes.gff" <<'PY'
import collections, sys

rows_tsv, gffdir, fasta, outpath = sys.argv[1:5]

# the four complexes mtDNA encodes subunits of. Complex II is nuclear
COMPLEX = {'ND1': 'I', 'ND2': 'I', 'ND3': 'I', 'ND4': 'I', 'ND4L': 'I',
           'ND5': 'I', 'ND6': 'I', 'CYTB': 'III', 'COX1': 'IV', 'COX2': 'IV',
           'COX3': 'IV', 'ATP6': 'V', 'ATP8': 'V'}


def attrs(field):
    return dict(p.split('=', 1) for p in field.strip().split(';') if '=' in p)


def genes(path):
    """(start, end, strand, name, complex) per gene, in coordinate order."""
    lines, children = [], {}
    for line in open(path):
        if line.startswith('#'):
            continue
        f = line.rstrip('\n').split('\t')
        if len(f) < 9:
            continue
        a = attrs(f[8])
        if f[2] == 'gene':
            lines.append((int(f[3]), int(f[4]), f[6], a))
        elif f[2] in ('CDS', 'tRNA', 'rRNA') and 'Parent' in a:
            children.setdefault(a['Parent'], a)
    out, rrna = [], 0
    for start, end, strand, a in sorted(lines):
        biotype = a.get('gene_biotype')
        if biotype == 'protein_coding':
            # ND1, COX1, CYTB and the rest are the gene Name in every RefSeq
            # mitogenome; the tRNA and rRNA genes carry a locus tag in some, so
            # those take their name from the child feature or from their order
            name, klass = a['Name'], COMPLEX[a['Name']]
        elif biotype == 'rRNA':
            rrna += 1
            name, klass = f'RNR{rrna}', 'rRNA'
        elif biotype == 'tRNA':
            name = children.get(a['ID'], {}).get('product', 'tRNA')
            klass = 'tRNA'
        else:
            continue
        out.append([start, end, strand, name, klass])
    # tRNA-Leu and tRNA-Ser are each two genes with one product, so number them
    # in coordinate order and every feature has a name of its own
    twice = collections.Counter(g[3] for g in out)
    nth = collections.Counter()
    for g in out:
        if twice[g[3]] > 1:
            nth[g[3]] += 1
            g[3] = f'{g[3]}-{nth[g[3]]}'
    return out


lengths, name = {}, None
for line in open(fasta):
    if line.startswith('>'):
        name = line[1:].strip()
        lengths[name] = 0
    else:
        lengths[name] += len(line.strip())

tally = collections.Counter()
with open(outpath, 'w') as out:
    print('##gff-version 3', file=out)
    for line in open(rows_tsv):
        if line.startswith('#') or not line.strip():
            continue
        accession, label = line.rstrip('\n').split('\t')
        length, last = lengths[label], 0
        for start, end, strand, name, klass in genes(f'{gffdir}/{accession}.gff'):
            # the human D-loop runs past the end of the linearized genome and
            # RefSeq writes the wrapped coordinate, so clamp every end
            end = min(end, length)
            print(f'{label}\tRefSeq\tgene\t{start}\t{end}\t.\t{strand}\t.'
                  f'\tName={name};complex={klass}', file=out)
            tally[klass] += 1
            last = max(last, end)
        # the control region is what follows the last gene, tRNA-Pro. RefSeq
        # annotates it as D_loop in six of the eight, so derive it the same way
        # for all eight. color= paints this one feature whatever the scale says
        print(f'{label}\tRefSeq\tD_loop\t{last + 1}\t{length}\t.\t.\t.'
              f'\tName=control region;color=255,205,0', file=out)
        tally['control region'] += 1

for klass in ('I', 'III', 'IV', 'V', 'rRNA', 'tRNA', 'control region'):
    print(f'  {klass}: {tally[klass]}')
PY

# 7. where each gene lands after the aligner's gaps: the same feature projected
#    into alignment columns, row by row
echo "projecting features into alignment columns"
python3 - "$OUT/mito.afa" "$OUT/mito-genes.gff" <<'PY'
import sys

afa, gff = sys.argv[1:3]

seqs, name = {}, None
for line in open(afa):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = []
    else:
        seqs[name].append(line.strip())

# column of each 1-based residue of the row, which is what the viewer's overlay
# computes when it projects a feature through that row's gaps
index = {}
for name, parts in seqs.items():
    cols = [0]
    for i, c in enumerate(''.join(parts), start=1):
        if c != '-':
            cols.append(i)
    index[name] = cols

spans = {}
for line in open(gff):
    if line.startswith('#'):
        continue
    f = line.rstrip('\n').split('\t')
    a = dict(p.split('=', 1) for p in f[8].split(';') if '=' in p)
    row = index[f[0]]
    spans.setdefault(a['Name'], []).append(
        (f[0], int(f[3]), row[int(f[3])], row[int(f[4])]))

for name in ('COX1', 'CYTB', 'ND1', 'ND6', 'control region'):
    print(f'{name}:')
    for label, bp, start, end in spans[name]:
        print(f'  {label:9s} bp {bp:>6d} -> columns {start}-{end}')

print(f"{'feature':16s} {'start spread':>12s} {'end spread':>10s}")
for name in ('RNR1', 'RNR2', 'ND1', 'ND2', 'COX1', 'COX2', 'ATP8', 'ATP6',
             'COX3', 'ND3', 'ND4L', 'ND4', 'ND5', 'ND6', 'CYTB',
             'control region'):
    starts = [s for _, _, s, _ in spans[name]]
    ends = [e for _, _, _, e in spans[name]]
    print(f'{name:16s} {max(starts) - min(starts):12d} {max(ends) - min(ends):10d}')
worst = max(max(s for _, _, s, _ in v) - min(s for _, _, s, _ in v)
            for n, v in spans.items() if n.startswith('tRNA'))
print(f'22 tRNAs: worst start-column spread {worst}')
PY

echo
echo "wrote $OUT/mito.afa, $OUT/mito.nwk, $OUT/mito-genes.gff"
