#!/usr/bin/env bash
# Build the p53 variant-effect layers in docs/tutorials/p53_variant_effects.md:
# a vertebrate p53 alignment and tree from NCBI, plus three per-residue tracks
# over the Human row (ClinVar, AlphaMissense, MaveDB), and the ?data= link that
# opens all of it.
#
#   bash build_p53_variant_effects.sh [outdir]
#
# Needs: curl, jq, awk, and an aligner. mafft and FastTree are used from PATH
# when they are there and run out of quay.io/biocontainers through docker when
# they are not.
set -euo pipefail

OUT=${1:-.}
mkdir -p "$OUT"
cd "$OUT"

MAFFT_IMAGE=quay.io/biocontainers/mafft:7.525--h031d066_1
FASTTREE_IMAGE=quay.io/biocontainers/fasttree:2.1.11--h031d066_4
EUTILS=https://eutils.ncbi.nlm.nih.gov/entrez/eutils
TOOL=tool=react-msaview-tutorial
LENGTH=393
ROW=Human
TRANSCRIPT=NM_000546

for tool in curl jq awk; do
  command -v "$tool" > /dev/null || {
    echo "need $tool on PATH" >&2
    exit 1
  }
done

# mafft/FastTree from PATH, or the same version out of a biocontainer. The
# docker form mounts the output directory at /d and runs there, so the paths
# inside the container are the ones the command would see on PATH.
run_tool() {
  local tool=$1 image=$2
  shift 2
  if command -v "$tool" > /dev/null; then
    "$tool" "$@"
  else
    docker run --rm -u "$(id -u):$(id -g)" -v "$PWD:/d" -w /d \
      "$image" "$tool" "$@"
  fi
}

# 1. the rows. One RefSeq protein accession per species, and the label the
#    viewer draws down the side. Human is NP_000537.3, the product of
#    NM_000546, so residue i of that row is residue i everywhere below.
ACCESSIONS=accessions.tsv
if [ ! -f "$ACCESSIONS" ]; then
  cat > "$ACCESSIONS" << 'EOF'
NP_000537.3	Human
XP_045231359.1	Macaque
XP_027375188.1	Cow
XP_047612858.1	Pig
NP_001189334.1	Horse
XP_025284307.1	Dog
XP_010594888.1	Elephant
XP_030101782.1	Mouse
NP_112251.2	Rat
XP_056673571.1	Opossum
NP_990595.1	Chicken
XP_065426476.1	Turtle
XP_062840611.1	Anole
NP_001001903.1	Frog
XP_073805887.1	Zebrafish
EOF
fi

# 2. fetch them in one efetch call, then rename each record to its label
echo "fetching $(wc -l < "$ACCESSIONS") p53 orthologs from NCBI"
IDS=$(cut -f1 "$ACCESSIONS" | paste -sd,)
curl -sf "$EUTILS/efetch.fcgi?$TOOL&db=protein&id=$IDS&rettype=fasta&retmode=text" \
  > p53-refseq.fa
awk 'NR == FNR {split($0, row, "\t"); label[row[1]] = row[2]; next}
  /^>/ {split($0, field, " "); print ">" label[substr(field[1], 2)]; next}
  NF {print}' "$ACCESSIONS" p53-refseq.fa > p53.fasta
awk '/^>/ {if (name) print name, n; name = $0; n = 0; next} {n += length($0)}
  END {print name, n}' p53.fasta

# 3. align, and infer a tree from the alignment
run_tool mafft "$MAFFT_IMAGE" --auto --anysymbol p53.fasta \
  > p53.afa 2> mafft.log || {
  cat mafft.log >&2
  exit 1
}
grep -c '^>' p53.afa > /dev/null
COLUMNS=$(awk '/^>/ {if (n) {print n; exit} next} {n += length($0)}' p53.afa)
echo "aligned: $COLUMNS columns"

run_tool FastTree "$FASTTREE_IMAGE" -lg -quiet p53.afa \
  > p53.nh

# 4. ClinVar: how many distinct missense alleles at each residue does ClinVar
#    classify as pathogenic or likely pathogenic. An esearch term matches
#    "pathogenic" loosely enough to pull in "Conflicting classifications", so
#    the classification is filtered off the record itself.
TERM='TP53[gene] AND "missense variant"[molecular consequence]'
curl -sf "$EUTILS/esearch.fcgi?$TOOL&db=clinvar&retmode=json&retmax=5000&term=$(
  jq -rn --arg t "$TERM" '$t | @uri'
)" | jq -r '.esearchresult.idlist[]' > clinvar.ids
echo "$(wc -l < clinvar.ids) TP53 missense records in ClinVar"

: > clinvar.changes
split -l 200 clinvar.ids clinvar.batch.
for batch in clinvar.batch.*; do
  curl -sf "$EUTILS/esummary.fcgi?$TOOL&db=clinvar&retmode=json&id=$(paste -sd, "$batch")" |
    jq -r '.result | del(.uids) | .[]
      | select(.germline_classification.description
        | IN("Pathogenic", "Likely pathogenic", "Pathogenic/Likely pathogenic"))
      | .variation_set[].variation_name' >> clinvar.changes
  sleep 0.4
done
rm -f clinvar.batch.*

# one count per residue, in a residue's own numbering on NM_000546. A stop is
# not one residue swapped for another and it takes out everything downstream,
# so p.Arg248Ter does not belong on a per-residue missense count.
clinvar_counts() {
  grep "^$TRANSCRIPT" clinvar.changes |
    grep -oE '\(p\.[A-Z][a-z]{2}[0-9]+[A-Z][a-z]{2}\)' |
    grep -v 'Ter)$' |
    grep -oE '[0-9]+' |
    awk -v n=$LENGTH '{count[$1]++}
      END {for (i = 1; i <= n; i++) printf "%s%d", (i > 1 ? "," : ""), count[i]}'
}
CLINVAR=$(clinvar_counts)
echo "$CLINVAR" | awk -F, -v n=$LENGTH '{
  for (i = 1; i <= NF; i++) {
    total += $i
    if ($i) hit++
    if ($i > max) {max = $i; where = i}
    if (i >= 102 && i <= 292) inDbd += $i
  }
  printf "%d pathogenic missense variants over %d/%d residues, %d%% of them in ", total, hit, n, 100 * inDbd / total
  printf "the DNA-binding domain; deepest %d at residue %d\n", max, where
}'

# 5. AlphaMissense: the mean predicted pathogenicity of the 19 substitutions at
#    each residue. The CSV is the one the AlphaFold entry for P04637 points at.
AM_URL=$(curl -sf https://alphafold.ebi.ac.uk/api/prediction/P04637 |
  jq -r '.[0].amAnnotationsUrl')
curl -sf "$AM_URL" -o alphamissense.csv
echo "$(($(wc -l < alphamissense.csv) - 1)) AlphaMissense substitutions"

am_values() {
  tail -n +2 alphamissense.csv |
    awk -F, -v n=$LENGTH '{
      pos = substr($1, 2, length($1) - 2)
      sum[pos] += $2
      seen[pos]++
    }
    END {for (i = 1; i <= n; i++)
      printf "%s%.2f", (i > 1 ? "," : ""), (seen[i] ? sum[i] / seen[i] : 0)}'
}
AM=$(am_values)

# 6. MaveDB: the Giacomelli 2018 saturation screen, scored in A549 cells that
#    keep their own wild-type p53, under nutlin-3. A positive score is a
#    variant that outgrew the library, which here means it knocked out p53
#    function in the presence of the wild-type copy.
curl -sfL https://api.mavedb.org/api/v1/score-sets/urn:mavedb:00000068-a-1/scores \
  -o mavedb.csv
echo "$(($(wc -l < mavedb.csv) - 1)) MaveDB variants"

# The track clamps at 0, so a residue whose substitutions come out neutral or
# better draws nothing; write the floor rather than a negative the bar cannot
# show. Synonymous (p.Met384=) and nonsense (p.Arg248Ter) rows are not
# substitutions of one residue for another.
mave_values() {
  tail -n +2 mavedb.csv |
    awk -F, -v n=$LENGTH '$4 ~ /^p\.[A-Z][a-z][a-z][0-9]+[A-Z][a-z][a-z]$/ &&
      $4 !~ /Ter$/ && $5 != "NA" {
      match($4, /[0-9]+/)
      pos = substr($4, RSTART, RLENGTH)
      sum[pos] += $5
      seen[pos]++
    }
    END {for (i = 1; i <= n; i++) {
      mean = seen[i] ? sum[i] / seen[i] : 0
      printf "%s%.2f", (i > 1 ? "," : ""), (mean > 0 ? mean : 0)
    }}'
}
MAVE=$(mave_values)
tail -n +2 mavedb.csv |
  awk -F, '$4 ~ /^p\.[A-Z][a-z][a-z][0-9]+[A-Z][a-z][a-z]$/ && $4 !~ /Ter$/ &&
    $5 != "NA" {kept++} END {print kept " of them missense with a score"}'

# 7. what the three say at the hotspots, and at a control residue in the
#    disordered N terminus
echo
printf 'residue\tClinVar\tAlphaMissense\tMaveDB\n'
for pos in 175 245 248 249 273 282 47 72 89; do
  printf '%s\t%s\t%s\t%s\n' "$pos" \
    "$(echo "$CLINVAR" | cut -d, -f"$pos")" \
    "$(echo "$AM" | cut -d, -f"$pos")" \
    "$(echo "$MAVE" | cut -d, -f"$pos")"
done

# region means, the DNA-binding domain against the two disordered ends
# (UniProt P04637: DNA binding 102-292, transactivation 1-44, disordered 50-96,
# oligomerization 325-356)
echo
region_means() {
  local name=$1 start=$2 end=$3
  printf '%s\t%s\n' "$name" "$(
    for values in "$CLINVAR" "$AM" "$MAVE"; do
      echo "$values" | cut -d, -f"$start-$end" |
        awk -F, '{for (i = 1; i <= NF; i++) s += $i; printf "%.2f\t", s / NF}'
    done
  )"
}
printf 'region\tClinVar\tAlphaMissense\tMaveDB\n'
region_means 'transactivation 1-44' 1 44
region_means 'proline-rich 50-96' 50 96
region_means 'DNA-binding 102-292' 102 292
region_means 'oligomerization 325-356' 325 356

# 8. is a hotspot column conserved across the tree? Count the rows carrying the
#    Human residue in that column, and the rows carrying anything at all.
echo
awk -v positions="175,245,248,249,273,282,47,72,89" '
  /^>/ {name = substr($0, 2); order[++rows] = name; next}
  {seq[name] = seq[name] $0}
  END {
    n = split(positions, want, ",")
    # residue -> column on the Human row
    residue = 0
    for (col = 1; col <= length(seq["Human"]); col++) {
      if (substr(seq["Human"], col, 1) != "-") {
        column[++residue] = col
      }
    }
    printf "residue\thuman\tsame\tgap\n"
    for (i = 1; i <= n; i++) {
      col = column[want[i]]
      here = substr(seq["Human"], col, 1)
      same = 0
      gaps = 0
      for (r = 1; r <= rows; r++) {
        letter = substr(seq[order[r]], col, 1)
        if (letter == here) {
          same++
        } else if (letter == "-") {
          gaps++
        }
      }
      printf "%s\t%s\t%d/%d\t%d\n", want[i], here, same, rows, gaps
    }
  }' p53.afa

# 9. the three tracks as the viewer takes them. AlphaMissense goes in as a
#    percent against max 100 rather than a fraction against max 1: the values
#    travel inside the link, and a request line stops being served past 8 kB.
jq -n \
  --arg clinvar "$CLINVAR" --arg am "$AM" --arg mave "$MAVE" \
  --arg date "$(date +%F)" \
  --argjson clinvarMax "$(echo "$CLINVAR" | tr ',' '\n' | sort -n | tail -1)" '
  {
    generatedBy: "docs/tutorials/scripts/build_p53_variant_effects.sh",
    retrieved: $date,
    row: "Human",
    highlights: [
      {row: "Human", start: 102, end: 292, label: "DNA-binding"},
      {row: "Human", start: 325, end: 356, label: "Oligomerization"}
    ],
    columnTracks: [
      {
        id: "clinvar", name: "ClinVar pathogenic missense", kind: "bar",
        row: "Human", color: "#c0392b", height: 60,
        max: $clinvarMax, values: ($clinvar | split(",") | map(tonumber))
      },
      {
        id: "alphamissense", name: "AlphaMissense mean (x100)", kind: "bar",
        row: "Human", color: "#1565c0", height: 60,
        max: 100, values: ($am | split(",") | map(tonumber * 100 | round))
      },
      {
        id: "mavedb", name: "MaveDB nutlin-3, p53WT", kind: "bar",
        row: "Human", color: "#2e7d32", height: 60,
        max: 2, values: ($mave | split(",") | map(tonumber))
      }
    ]
  }' > p53-layers.json

# 10. the link: the hosted alignment and tree, the tracks, the bands, and
#     relativeTo, which draws every other row as a diff against Human
jq -rj \
  --arg msa "${MSA_URI:-data/p53/p53-vertebrates.afa}" \
  --arg tree "${TREE_URI:-data/p53/p53-vertebrates.nh}" '
  {
    msaview: {
      type: "MsaView",
      height: 560,
      treeAreaWidth: 140,
      colWidth: 2.6,
      rowHeight: 15,
      relativeTo: "Human",
      colorSchemeName: "clustalx_protein_dynamic",
      turnedOffTracks: {"property-conservation": true},
      msaFilehandle: {uri: $msa},
      treeFilehandle: {uri: $tree},
      highlights: .highlights,
      columnTracks: .columnTracks
    }
  } | @uri' p53-layers.json > p53-link.txt
printf 'https://gmod.org/JBrowseMSA/demo/?data=%s\n' "$(cat p53-link.txt)" \
  > p53-link.url

echo
echo "wrote $PWD/{p53.afa,p53.nh,p53-layers.json,p53-link.url}"
echo "the link is $(wc -c < p53-link.txt) characters of a request line that"
echo "stops being served past 8192"
