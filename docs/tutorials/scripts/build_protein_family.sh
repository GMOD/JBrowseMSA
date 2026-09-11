#!/usr/bin/env bash
# Build a protein family alignment, tree and domain GFF from a list of UniProt
# accessions. Every step is the one shown in docs/tutorials/protein_family.md.
#
#   bash build_protein_family.sh [accessions.tsv] [outdir]
#
# Needs: curl, clustalw, and react-msaview-cli on PATH
# (npm install -g react-msaview-cli). Writes the accession list itself if one is
# not supplied, so the script runs with no arguments.
set -euo pipefail

ACCESSIONS=${1:-accessions.tsv}
OUT=${2:-.}
mkdir -p "$OUT"

if [ ! -f "$ACCESSIONS" ]; then
  echo "writing $ACCESSIONS (NLRP1 across vertebrates)"
  cat > "$ACCESSIONS" <<'EOF'
Q9C000	Human
H2QC06	Chimp
A0A1D5QWR0	Rhesus
A0A8I3MJ75	Dog
A0ABM3YGI7	Hedgehog
E1BNN6	Cow
K9IW94	Pig
A0A9L0RFW2	Horse
Q2LKU9	Mouse
D9I2G4	Rat
A0ABM2XMM7	Hamster
A0A386CAB9	Zebrafish
EOF
fi

# 1. one FASTA record per accession, named by the label rather than the
#    accession, since the label is what the viewer draws down the side
: > "$OUT/family.fasta"
while IFS=$'\t' read -r accession label; do
  case "$accession" in '#'* | '') continue ;; esac
  printf '>%s\n' "$label" >> "$OUT/family.fasta"
  curl -sf "https://rest.uniprot.org/uniprotkb/$accession.fasta" |
    tail -n +2 | tr -d '\n' >> "$OUT/family.fasta"
  printf '\n' >> "$OUT/family.fasta"
  echo "  fetched $label ($accession)"
done < "$ACCESSIONS"

# 2. align
clustalw -INFILE="$OUT/family.fasta" -ALIGN -TYPE=PROTEIN \
  -OUTPUT=FASTA -OUTFILE="$OUT/family.afa" > /dev/null

# 3. neighbor-joining tree from the alignment. ClustalW wraps the Newick across
#    lines; strip the whitespace so it is one string
clustalw -INFILE="$OUT/family.afa" -TREE -TYPE=PROTEIN \
  -OUTPUTTREE=phylip > /dev/null
tr -d '[:space:]' < "$OUT/family.ph" > "$OUT/family.nwk"

# 4. domains, from InterPro's precomputed matches rather than a scan
react-msaview-cli interpro "$ACCESSIONS" -o "$OUT/family-domains.gff"

echo
echo "wrote $OUT/family.afa, $OUT/family.nwk, $OUT/family-domains.gff"
