#!/usr/bin/env bash
# Build a codon-aware alignment of TRIM5 across primates and rodents, a tree,
# a gene-structure GFF and a per-codon dN/dS track from HyPhy FEL. Every step
# is the one shown in docs/tutorials/codon_selection.md.
#
#   bash build_codon_selection.sh [outdir]
#
# Needs: curl, python3, docker, and react-msaview-cli on PATH
# (npm install -g react-msaview-cli). NCBI's `datasets` CLI is fetched if
# missing. Docker pulls quay.io biocontainers for macse, fasttree and hyphy
# (pinned tags below) on first run.
set -euo pipefail

OUT=${1:-.}
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)

MACSE_IMAGE=quay.io/biocontainers/macse:2.07--hdfd78af_0
FASTTREE_IMAGE=quay.io/biocontainers/fasttree:2.2.0--h7b50bb2_1
HYPHY_IMAGE=quay.io/biocontainers/hyphy:2.5.101--h526e2cb_0
GENE_ID=85363 # human TRIM5, NCBI Gene

if ! command -v datasets >/dev/null 2>&1; then
  echo "fetching NCBI datasets CLI..."
  curl -sL -o "$OUT/datasets" \
    https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets
  chmod +x "$OUT/datasets"
  DATASETS="$OUT/datasets"
else
  DATASETS=datasets
fi

# 1. every TRIM5 ortholog NCBI Datasets knows about (33 species: primates plus
#    a handful of rodents and squirrels as the outgroup)
"$DATASETS" download gene gene-id "$GENE_ID" --ortholog all \
  --include gene,cds,protein --filename "$OUT/trim5_orthologs.zip"
unzip -o -q "$OUT/trim5_orthologs.zip" -d "$OUT/ortho"

# 2. one CDS per species: the curated (NM_) RefSeq transcript where one
#    exists, else the predicted (XM_) transcript whose length is closest to
#    the well-annotated human isoform (1482 nt / 493 aa + stop) -- a gene with
#    dozens of predicted splice variants otherwise has no principled "the"
#    transcript to align
python3 - "$OUT/ortho/ncbi_dataset/data/cds.fna" "$OUT/trim5_cds_raw.fasta" <<'PY'
import re, sys, collections

cds_path, out_path = sys.argv[1], sys.argv[2]
seqs, order = {}, []
name, buf = None, []
for line in open(cds_path):
    line = line.rstrip('\n')
    if line.startswith('>'):
        if name:
            seqs[name] = ''.join(buf)
        m = re.match(r'>(\S+)\s+(\S+)\s+\[organism=([^\]]+)\].*?\[GeneID=(\d+)\]', line)
        name = (m.group(1), m.group(2), m.group(3), m.group(4))
        order.append(name)
        buf = []
    else:
        buf.append(line)
if name:
    seqs[name] = ''.join(buf)

by_org = collections.defaultdict(list)
for acc, sym, org, gid in order:
    by_org[org].append((acc, seqs[(acc, sym, org, gid)]))

TARGET = 1482
LABELS = {
    "Homo sapiens": "human", "Pan troglodytes": "chimp", "Pan paniscus": "bonobo",
    "Gorilla gorilla gorilla": "gorilla", "Pongo abelii": "orangutan_sumatran",
    "Pongo pygmaeus": "orangutan_bornean", "Nomascus leucogenys": "gibbon_nomascus",
    "Hylobates moloch": "gibbon_silvery", "Symphalangus syndactylus": "siamang",
    "Macaca mulatta": "macaque_rhesus", "Macaca fascicularis": "macaque_crab_eating",
    "Macaca thibetana thibetana": "macaque_tibetan", "Papio anubis": "baboon_olive",
    "Theropithecus gelada": "gelada", "Mandrillus leucophaeus": "drill",
    "Cercocebus atys": "mangabey_sooty", "Chlorocebus sabaeus": "vervet",
    "Trachypithecus francoisi": "langur_francois",
    "Rhinopithecus bieti": "snub_nosed_black", "Rhinopithecus roxellana": "snub_nosed_golden",
    "Colobus angolensis palliatus": "colobus_angolan",
    "Piliocolobus tephrosceles": "colobus_red", "Sapajus apella": "capuchin_tufted",
    "Cebus imitator": "capuchin_white_faced", "Saimiri boliviensis": "squirrel_monkey",
    "Carlito syrichta": "tarsier", "Lemur catta": "lemur_ring_tailed",
    "Propithecus coquereli": "sifaka", "Mus pahari": "mouse_pahari",
    "Rattus norvegicus": "rat", "Sciurus carolinensis": "squirrel_gray",
    "Callospermophilus lateralis": "ground_squirrel_golden_mantled",
    "Spermophilus citellus": "ground_squirrel_european",
}

with open(out_path, 'w') as out:
    for org in sorted(by_org, key=lambda o: LABELS.get(o, o)):
        label = LABELS.get(org)
        if not label:
            print(f"skipping {org}: no label assigned")
            continue
        nm = [t for t in by_org[org] if t[0].startswith('NM_')]
        pool = nm if nm else by_org[org]
        acc, seq = min(pool, key=lambda t: abs(len(t[1]) - TARGET))
        out.write(f">{label} {acc} {org}\n{seq}\n")
        if len(seq) % 3:
            print(f"WARNING {label}: {len(seq)} nt is not a multiple of 3")
print(f"wrote {out_path}")
PY

# 3. drop any ortholog whose single-copy CDS translates with an internal stop
#    codon -- a predicted (XM_) gene model occasionally has one, and there is
#    no second transcript to fall back on. One ortholog in this set does
#    (see docs/tutorials/codon_selection.md).
python3 - "$OUT/trim5_cds_raw.fasta" "$OUT/trim5_cds.fasta" <<'PY'
import sys

CODON = {}
b = "TTT TTC TTA TTG CTT CTC CTA CTG ATT ATC ATA ATG GTT GTC GTA GTG TCT TCC TCA TCG CCT CCC CCA CCG ACT ACC ACA ACG GCT GCC GCA GCG TAT TAC TAA TAG CAT CAC CAA CAG AAT AAC AAA AAG GAT GAC GAA GAG TGT TGC TGA TGG CGT CGC CGA CGG AGT AGC AGA AGG GGT GGC GGA GGG".split()
a = "F F L L L L L L I I I M V V V V S S S S P P P P T T T T A A A A Y Y * * H H Q Q N N K K D D E E C C * W R R R R S S R R G G G G".split()
for k, v in zip(b, a):
    CODON[k] = v

seqs, order = {}, []
name, buf = None, []
for line in open(sys.argv[1]):
    line = line.rstrip('\n')
    if line.startswith('>'):
        if name:
            seqs[name] = ''.join(buf)
        name = line[1:]
        order.append(name)
        buf = []
    else:
        buf.append(line)
if name:
    seqs[name] = ''.join(buf)

with open(sys.argv[2], 'w') as out:
    for name in order:
        s = seqs[name].upper()
        codons = [s[i:i + 3] for i in range(0, len(s) - 3, 3)]  # last codon = stop
        stops = [i for i, c in enumerate(codons) if CODON.get(c) == '*']
        if stops:
            print(f"dropping {name.split()[0]}: internal stop codon(s) at codon {[i + 1 for i in stops]}")
            continue
        out.write(f">{name}\n{seqs[name]}\n")
PY

# 4. codon-aware alignment (MACSE keeps every sequence in frame and marks
#    frameshifts instead of destroying the reading frame the way a plain
#    nucleotide aligner would)
docker run --rm -e LC_ALL=C.UTF-8 -e LANG=C.UTF-8 \
  -v "$OUT":/data -w /data "$MACSE_IMAGE" \
  macse -prog alignSequences -seq trim5_cds.fasta \
  -out_NT trim5_macse_NT.fasta -out_AA trim5_macse_AA.fasta

# 5. strip each row's own terminal stop codon (present because the CDS
#    NCBI extracts includes it) -- codon models don't expect a stop in the
#    alignment, and each row's stop sits at a different column once gapped
python3 - "$OUT/trim5_macse_NT.fasta" "$OUT/trim5_cds_aln.fasta" <<'PY'
import sys

CODON = {}
b = "TTT TTC TTA TTG CTT CTC CTA CTG ATT ATC ATA ATG GTT GTC GTA GTG TCT TCC TCA TCG CCT CCC CCA CCG ACT ACC ACA ACG GCT GCC GCA GCG TAT TAC TAA TAG CAT CAC CAA CAG AAT AAC AAA AAG GAT GAC GAA GAG TGT TGC TGA TGG CGT CGC CGA CGG AGT AGC AGA AGG GGT GGC GGA GGG".split()
a = "F F L L L L L L I I I M V V V V S S S S P P P P T T T T A A A A Y Y * * H H Q Q N N K K D D E E C C * W R R R R S S R R G G G G".split()
for k, v in zip(b, a):
    CODON[k] = v

seqs, order = {}, []
name, buf = None, []
for line in open(sys.argv[1]):
    line = line.rstrip('\n')
    if line.startswith('>'):
        if name:
            seqs[name] = ''.join(buf)
        name = line[1:].split()[0]  # keep the label only, drop accession/organism
        order.append(name)
        buf = []
    else:
        buf.append(line)
if name:
    seqs[name] = ''.join(buf)

with open(sys.argv[2], 'w') as out:
    for name in order:
        s = list(seqs[name].upper())
        last_nongap = max(i for i, ch in enumerate(s) if ch != '-')
        codon_start = (last_nongap // 3) * 3
        codon = ''.join(s[codon_start:codon_start + 3])
        if CODON.get(codon) == '*':
            s[codon_start:codon_start + 3] = ['-', '-', '-']
        out.write(f">{name}\n{''.join(s)}\n")
PY

# 6. a maximum-likelihood tree from the protein translation (more signal at
#    this evolutionary depth than the nucleotides), read by both HyPhy and
#    the viewer
docker run --rm -v "$OUT":/data -w /data "$FASTTREE_IMAGE" \
  sh -c "FastTree trim5_macse_AA.fasta > trim5.nwk 2> fasttree.log"

# 7. Stockholm with the tree embedded (#=GF NH), same convention as the F12
#    example (scripts/f12-cetacean)
python3 - "$OUT/trim5_cds_aln.fasta" "$OUT/trim5.nwk" "$OUT/trim5-cds.stock" <<'PY'
import sys

seqs, order = {}, []
name, buf = None, []
for line in open(sys.argv[1]):
    line = line.rstrip('\n')
    if line.startswith('>'):
        if name:
            seqs[name] = ''.join(buf)
        name = line[1:].split()[0]
        order.append(name)
        buf = []
    else:
        buf.append(line)
if name:
    seqs[name] = ''.join(buf)

tree = open(sys.argv[2]).read().strip()
width = max(len(n) for n in order) + 2
with open(sys.argv[3], 'w') as out:
    out.write('# STOCKHOLM 1.0\n')
    out.write(f'#=GF NH {tree}\n')
    for name in order:
        out.write(f'{name.ljust(width)}{seqs[name]}\n')
    out.write('//\n')
PY

# 8. the 7-exon coding structure of the MANE Select transcript, projected onto
#    every row from the human reference row -- the general form of
#    scripts/f12-cetacean/exon_gff.py
react-msaview-cli genestructure "$OUT/trim5_cds_aln.fasta" \
  --gene-id "$GENE_ID" --transcript NM_033034.3 --ref human \
  -o "$OUT/trim5-exons.gff"

# 9. per-codon dN/dS with HyPhy FEL (Fixed Effects Likelihood): alpha
#    (synonymous rate) and beta (non-synonymous rate) at every codon, and a
#    likelihood-ratio p-value for beta != alpha at that site
python3 - "$OUT/trim5_cds_aln.fasta" "$OUT/trim5_fel_input.fasta" <<'PY'
import sys
with open(sys.argv[2], 'w') as out:
    for line in open(sys.argv[1]):
        out.write(line)
PY
docker run --rm -v "$OUT":/data -w /data "$HYPHY_IMAGE" \
  hyphy fel --alignment trim5_fel_input.fasta --tree trim5.nwk \
  --output trim5_fel.json --branches All

# 10. per-column dN/dS values for the viewer's columnTracks bar: one value per
#     alignment codon (beta/alpha, clamped to 5 so one numerically unstable
#     site near alpha=0 -- see the tutorial -- doesn't blow out the scale),
#     repeated across that codon's 3 nucleotide columns
python3 - "$OUT/trim5_fel.json" "$OUT/trim5-dnds-values.json" <<'PY'
import json, sys

CAP = 5.0
d = json.load(open(sys.argv[1]))
content = d['MLE']['content']['0']
values = []
for alpha, beta, ab, lrt, p, tbl in content:
    omega = beta / alpha if alpha > 1e-6 else (CAP if beta > 1e-6 else 0.0)
    v = round(min(omega, CAP), 3)
    values.extend([v, v, v])
json.dump(values, open(sys.argv[2], 'w'))
print(f"wrote {sys.argv[2]}: {len(values)} values")
PY

echo
echo "wrote $OUT/trim5-cds.stock, $OUT/trim5-exons.gff, $OUT/trim5-dnds-values.json"
echo "FEL results: $OUT/trim5_fel.json"
