#!/usr/bin/env bash
# Build one gene-neighborhood GFF, one TrpB alignment and one tree from a list
# of RefSeq bacterial genomes. Every step is the one shown in
# docs/tutorials/gene_neighborhoods.md, and every number that page quotes is
# printed by a run of this script.
#
#   bash build_gene_neighborhoods.sh [rows.tsv] [outdir]
#
# Needs: curl, clustalw (apt install clustalw), python3.
# Writes the genome list itself if one is not supplied, so the script runs with
# no arguments. A genome's annotation is about 3 MB and NCBI takes 20 to 30
# seconds to serve one, so the downloads are cached in outdir/raw and a rerun
# skips them.
set -euo pipefail

ROWS=${1:-trp-rows.tsv}
OUT=${2:-.}
FLANK=8000
ANCHOR=trpE
CONTROL=trpD
mkdir -p "$OUT/raw"

if [ ! -f "$ROWS" ]; then
  echo "writing $ROWS (twelve bacterial genomes)"
  cat > "$ROWS" <<'EOF'
NC_000913.3	E_coli
NC_003143.1	Y_pestis
NC_002505.1	V_cholerae
NC_004347.2	S_oneidensis
NC_000907.1	H_influenzae
NC_002516.2	P_aeruginosa
NC_000915.1	H_pylori
NC_000964.3	B_subtilis
NC_007795.1	S_aureus
NC_003450.3	C_glutamicum
NC_000962.3	M_tuberculosis
NC_004663.1	B_thetaiotaomicron
EOF
fi

# 1. RefSeq's own GFF3 for each whole genome, one request each. sviewer serves
#    the complete annotation and ignores a from=/to= range, so the window is
#    cut in step 2
echo "fetching annotations"
while IFS=$'\t' read -r accession label; do
  case "$accession" in '#'* | '') continue ;; esac
  gff="$OUT/raw/$accession.gff"
  [ -s "$gff" ] || curl -sf --compressed --retry 5 --retry-all-errors \
    "https://www.ncbi.nlm.nih.gov/sviewer/viewer.fcgi?id=$accession&report=gff3&retmode=text" \
    -o "$gff"
done < "$ROWS"

# 2. the window: FLANK bases either side of the start of trpB, turned so that
#    trpB points right, with every gene lying wholly inside it
echo "cutting windows of $FLANK bp either side of trpB"
python3 - "$ROWS" "$OUT/raw" "$OUT/trp-neighborhoods.gff" "$OUT/trpB-ids.tsv" "$FLANK" <<'PY'
import collections, sys, urllib.parse

rows_tsv, rawdir, outpath, idspath, flank = sys.argv[1:6]
flank = int(flank)

# RefSeq gives many trp genes a product and no gene symbol. These products
# name one trp enzyme each; the product of a gene RefSeq already names is not
# read, and the first match wins. The glutamine amidotransferase product is shared with pabA, and every
# gene carrying it here sits next to a trpD
PRODUCT_SYMBOL = [
    ('aminodeoxychorismate/anthranilate synthase component II', 'trpG'),
    ('anthranilate synthase component II', 'trpG'),
    ('anthranilate synthase component 1', 'trpE'),
    ('anthranilate synthase component I', 'trpE'),
    ("N-(5'-phosphoribosyl)anthranilate isomerase", 'trpF'),
    ('phosphoribosylanthranilate isomerase', 'trpF'),
    ('indole-3-glycerol phosphate synthase', 'trpC'),
    ('tryptophan synthase subunit beta', 'trpB'),
    ('tryptophan synthase subunit alpha', 'trpA'),
    ('tryptophan operon leader peptide', 'trpL'),
    ('trp operon leader peptide', 'trpL'),
]
TRP = {'trpE', 'trpG', 'trpD', 'trpC', 'trpF', 'trpCF', 'trpB', 'trpA', 'trpL'}


def attrs(field):
    return {k: urllib.parse.unquote(v) for k, v in
            (p.split('=', 1) for p in field.strip().split(';') if '=' in p)}


def read(path):
    genes, product, protein = [], {}, {}
    for line in open(path):
        if line.startswith('#'):
            continue
        f = line.rstrip('\n').split('\t')
        if len(f) < 9:
            continue
        a = attrs(f[8])
        if f[2] in ('gene', 'pseudogene'):
            genes.append(dict(start=int(f[3]), end=int(f[4]), strand=f[6],
                              type=f[2], a=a))
        elif 'Parent' in a:
            product.setdefault(a['Parent'], a.get('product', ''))
            if 'protein_id' in a:
                protein.setdefault(a['Parent'], a['protein_id'])
    for g in genes:
        g['product'] = product.get(g['a']['ID'], '')
        g['protein'] = protein.get(g['a']['ID'])
        symbol = g['a'].get('gene')
        if not symbol:
            symbol = next((s for p, s in PRODUCT_SYMBOL
                           if g['product'].startswith(p)), None)
        g['symbol'] = symbol
    return genes


def role(g):
    if g['type'] == 'pseudogene':
        return 'pseudogene'
    if g['symbol'] in TRP:
        return 'trp'
    if 'regulator' in g['product'] or 'repressor' in g['product']:
        return 'regulator'
    return 'other'


tally = collections.Counter()
by_symbol = 0
with open(outpath, 'w') as out, open(idspath, 'w') as ids:
    print('##gff-version 3', file=out)
    print(f"  {'row':19s} {'genome':>10s} {'genes':>5s} {'window':>6s}  trp genes, 5' to 3'")
    for line in open(rows_tsv):
        if line.startswith('#') or not line.strip():
            continue
        accession, label = line.rstrip('\n').split('\t')
        genes = read(f'{rawdir}/{accession}.gff')
        trpb = [g for g in genes if g['symbol'] == 'trpB' and g['type'] == 'gene']
        if len(trpb) != 1:
            sys.exit(f'{label}: {len(trpb)} trpB genes')
        b = trpb[0]
        print(f"{label}\t{b['protein']}", file=ids)
        flip = b['strand'] == '-'
        origin = b['end'] if flip else b['start']
        lo, hi = origin - flank, origin + flank
        inside = [g for g in genes if g['start'] >= lo and g['end'] <= hi]

        def local(g):
            # 1-based within the window, read in trpB's direction
            if flip:
                return hi - g['end'] + 1, hi - g['start'] + 1, \
                    {'+': '-', '-': '+'}[g['strand']]
            return g['start'] - lo + 1, g['end'] - lo + 1, g['strand']

        rows = sorted((local(g) + (g,) for g in inside), key=lambda r: r[0])
        # position 1 of the window is the first base of its first whole gene,
        # so no row is placed by where the cut fell
        base = rows[0][0] - 1
        rows = [(s - base, e - base, strand, g) for s, e, strand, g in rows]
        for start, end, strand, g in rows:
            name = g['symbol'] or g['a']['locus_tag']
            if g['symbol'] and not g['a'].get('gene'):
                by_symbol += 1
            r = role(g)
            tally[r] += 1
            print(f"{label}\tRefSeq\tgene\t{start}\t{end}\t.\t{strand}\t.\t"
                  f"Name={name};role={r};locus_tag={g['a']['locus_tag']}",
                  file=out)
        order = ' '.join(g['symbol'] + ('*' if g['type'] == 'pseudogene' else '')
                         for _, _, _, g in rows if g['symbol'] in TRP)
        print(f"  {label:19s} {len(genes):>10d} {len(rows):>5d} {rows[-1][1]:>6d}  {order}")

print(f"  {sum(tally.values())} genes: " +
      ', '.join(f'{k} {tally[k]}' for k in ('trp', 'regulator', 'pseudogene', 'other')))
print(f'  {by_symbol} names come from the product table, the rest from RefSeq')
print('  * RefSeq annotates the gene as a pseudogene')
PY

# 3. the marker: TrpB, the one trp protein every genome here carries, fetched
#    by the protein_id on its CDS line and renamed to the row label
echo "fetching TrpB"
ids=$(cut -f2 "$OUT/trpB-ids.tsv" | paste -sd,)
curl -sf --retry 5 --retry-all-errors \
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id=$ids&rettype=fasta&retmode=text" \
  -o "$OUT/raw/trpB.fa"
python3 - "$OUT/trpB-ids.tsv" "$OUT/raw/trpB.fa" "$OUT/trpB.fasta" <<'PY'
import sys

idspath, src, dest = sys.argv[1:4]
seqs, name = {}, None
for line in open(src):
    if line.startswith('>'):
        name = line[1:].split()[0]
        seqs[name] = ''
    elif name:
        seqs[name] += line.strip()
with open(dest, 'w') as out:
    for line in open(idspath):
        label, protein = line.rstrip('\n').split('\t')
        print(f'>{label}\n{seqs[protein]}', file=out)
        print(f'  {label:19s} {protein:15s} {len(seqs[protein])} aa')
PY

# 4. align TrpB and build a neighbor-joining tree from the alignment. ClustalW
#    wraps the Newick across lines; strip the whitespace so it is one string
echo "aligning TrpB"
clustalw -INFILE="$OUT/trpB.fasta" -ALIGN -TYPE=PROTEIN \
  -OUTPUT=FASTA -OUTFILE="$OUT/trpB.afa" | grep -E 'Alignment Score'
awk '/^>/{n++} !/^>/{len[n]+=length($0)} END{print "  " len[1] " columns"}' "$OUT/trpB.afa"
clustalw -INFILE="$OUT/trpB.afa" -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip > /dev/null
tr -d '[:space:]' < "$OUT/trpB.ph" > "$OUT/trpB.nwk"
cat "$OUT/trpB.nwk"
echo

# 5. the control: after aligning every row on the start of trpE, where trpD
#    starts. The viewer's align transform applies the same shift
echo "distance from the start of $ANCHOR to the start of $CONTROL"
python3 - "$OUT/trp-neighborhoods.gff" "$ANCHOR" "$CONTROL" <<'PY'
import sys

gff, anchor, control = sys.argv[1:4]
rows = {}
for line in open(gff):
    if line.startswith('#'):
        continue
    f = line.rstrip('\n').split('\t')
    a = dict(p.split('=', 1) for p in f[8].split(';'))
    rows.setdefault(f[0], []).append((a['Name'], int(f[3]), int(f[4])))

for label, genes in rows.items():
    first = next((g for g in genes if g[0] == anchor), None)
    if first is None:
        print(f'  {label:19s} no {anchor} in the window, keeps its own origin')
        continue
    shift = 1 - first[1]
    after = [g for g in genes if g[0] == control]
    between = [g[0] for g in genes
               if first[1] < g[1] and (not after or g[1] < after[0][1])]
    if not after:
        print(f'  {label:19s} {anchor} at {first[1]}, no {control} in the window')
        continue
    print(f'  {label:19s} {anchor} at {first[1]}, shift {shift}: '
          f'{control} starts at {after[0][1] + shift - 1} '
          f'(genes between: {" ".join(between) or "none"})')
PY

echo
echo "wrote $OUT/trp-neighborhoods.gff, $OUT/trpB.afa, $OUT/trpB.nwk"
