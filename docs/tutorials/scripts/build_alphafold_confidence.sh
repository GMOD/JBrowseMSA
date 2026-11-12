#!/usr/bin/env bash
# Build the TDP-43 alignment of docs/tutorials/alphafold_confidence.md:
# fourteen vertebrate orthologs from UniProt, aligned, with a tree, the mean
# pLDDT of their AlphaFold models per column as a bar track, three rows' own
# pLDDT as strip tracks, each row's count of residues under 50 as a bar panel,
# and the Pfam domains of the human row as highlights. The tracks color pLDDT
# in AlphaFold DB's four bands. Every step is the one the page shows.
#
#   bash build_alphafold_confidence.sh [rows.tsv] [outdir]
#
# Needs: curl, clustalw and python3. Writes the row table itself if one is not
# supplied, so the script runs with no arguments.
set -euo pipefail

ROWS=${1:-rows.tsv}
OUT=${2:-.}
mkdir -p "$OUT" "$OUT/models"

REF=Human
UA='msaview-tutorial (https://gmod.org/JBrowseMSA)'
AFDB=https://alphafold.ebi.ac.uk/api/prediction
INTERPRO=https://www.ebi.ac.uk/interpro/api/entry/pfam/protein/uniprot

# One row per species: the label the viewer draws, then the UniProtKB accession.
# AlphaFold DB is keyed on UniProt, so the accession fetches the sequence and
# the model both.
if [ ! -f "$ROWS" ]; then
  echo "writing $ROWS (TARDBP across vertebrates)"
  cat > "$ROWS" <<'EOF'
Human	Q13148
Mouse	Q921F2
Cow	G3MX91
Elephant	G3TD75
Opossum	A0A5F8GU32
Platypus	F7EDX1
Chicken	Q5ZLN5
Turtle	K7FJ67
Lizard	A0A670IXJ6
Frog	Q28F51
Coelacanth	H3BC22
Zebrafish	Q802C7
Seabream	A0A671WI33
Ghostshark	A0A4W3GN84
EOF
fi

# 1. one UniProt request for every accession, then a FASTA whose defline is the
#    species label, so the rows carry the names the layers below use
accessions=$(awk -F'\t' '!/^#/ && NF {printf "%s%s", sep, $2; sep=","}' "$ROWS")
curl -sf -A "$UA" \
  "https://rest.uniprot.org/uniprotkb/accessions?accessions=$accessions&format=fasta" \
  -o "$OUT/tardbp-uniprot.fasta"

python3 - "$ROWS" "$OUT/tardbp-uniprot.fasta" "$OUT/tardbp.fasta" <<'PY'
import sys

rows, fetched, out = sys.argv[1:4]

seqs, acc = {}, None
for line in open(fetched):
    if line.startswith('>'):
        acc = line.split('|')[1]
        seqs[acc] = []
    elif acc:
        seqs[acc].append(line.strip())
seqs = {k: ''.join(v) for k, v in seqs.items()}

with open(out, 'w') as fh:
    for line in open(rows):
        if line.startswith('#') or not line.strip():
            continue
        label, acc = line.rstrip('\n').split('\t')[:2]
        if acc not in seqs:
            raise SystemExit(f'UniProt returned nothing for {acc}')
        fh.write(f'>{label}\n{seqs[acc]}\n')
        print(f'  {label:12s} {acc:12s} {len(seqs[acc])} aa')
PY

# 2. align. -OUTORDER=INPUT keeps the rows in the table's order, and ClustalW
#    wraps its FASTA, which the layers below read unwrapped
clustalw -INFILE="$OUT/tardbp.fasta" -ALIGN -TYPE=PROTEIN -OUTORDER=INPUT \
  -OUTPUT=FASTA -OUTFILE="$OUT/tardbp-wrapped.afa" > /dev/null

python3 - "$OUT/tardbp-wrapped.afa" "$OUT/tardbp.afa" <<'PY'
import sys

src, out = sys.argv[1:3]
seqs, name = {}, None
for line in open(src):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = ''
    else:
        seqs[name] += line.strip()
with open(out, 'w') as fh:
    for name, seq in seqs.items():
        fh.write(f'>{name}\n{seq}\n')
cols = len(next(iter(seqs.values())))
print(f'{len(seqs)} rows, {cols} columns')
PY
rm -f "$OUT/tardbp-wrapped.afa"

# 3. neighbor-joining tree from the alignment. ClustalW wraps the Newick across
#    lines, so strip the whitespace to leave one string
clustalw -INFILE="$OUT/tardbp.afa" -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip > /dev/null
tr -d '[:space:]' < "$OUT/tardbp.ph" > "$OUT/tardbp.nwk"
rm -f "$OUT/tardbp.ph"
cat "$OUT/tardbp.nwk"
echo

# 4. one AlphaFold model per accession. The API record names the model file,
#    whose B-factor column is the per-residue pLDDT, and it answers a request
#    with no User-Agent header with a 403.
while IFS=$'\t' read -r label acc rest; do
  case "$label" in '#'* | '') continue ;; esac
  url=$(curl -sf -A "$UA" "$AFDB/$acc" |
    python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["pdbUrl"])')
  curl -sf -A "$UA" "$url" -o "$OUT/models/$acc.pdb"
  echo "  $label $acc $(basename "$url")"
done < "$ROWS"

# 5. the Pfam matches of the reference row, which name its domains independently
#    of any structure
ref_acc=$(awk -F'\t' -v ref="$REF" '$1 == ref {print $2}' "$ROWS")
curl -sf -A "$UA" "$INTERPRO/$ref_acc" -o "$OUT/tardbp-pfam.json"

# 6. the layers. The pLDDT of a residue is the B-factor of its CA atom, and the
#    model's residues have to match the row before a position means anything.
python3 - "$ROWS" "$OUT" "$REF" <<'PY'
import json
import sys

rows_path, out, REF = sys.argv[1:4]

THREE_TO_ONE = {
    'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C', 'GLN': 'Q',
    'GLU': 'E', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I', 'LEU': 'L', 'LYS': 'K',
    'MET': 'M', 'PHE': 'F', 'PRO': 'P', 'SER': 'S', 'THR': 'T', 'TRP': 'W',
    'TYR': 'Y', 'VAL': 'V',
}
# the four pLDDT bands AlphaFold DB colors its models by, lowest first, as one
# threshold scale every layer below reads
CUTS = [50, 70, 90]
PLDDT = {
    'scale': {
        'type': 'threshold',
        'domain': CUTS,
        'range': ['#ff7d45', '#ffdb13', '#65cbf3', '#0053d6'],
    },
    'legend': {
        'title': 'pLDDT',
        'labels': ['Very low', 'Low', 'Confident', 'Very high'],
    },
}


def band(value):
    """0 for very low up to 3 for very high, as the threshold scale cuts"""
    return sum(value >= cut for cut in CUTS)


def read_model(path):
    """(sequence, [pLDDT per residue]) from the CA atoms of an AlphaFold PDB."""
    seq, plddt = '', []
    for line in open(path):
        if line.startswith('ATOM') and line[12:16].strip() == 'CA':
            seq += THREE_TO_ONE[line[17:20]]
            plddt.append(float(line[60:66]))
    return seq, plddt


def runs_under_50(values, min_run):
    """(first, last) 0-based index of every run of min_run or more values under 50"""
    runs, start = [], None
    for i, value in enumerate(list(values) + [100.0]):
        if value < 50 and start is None:
            start = i
        elif value >= 50 and start is not None:
            if i - start >= min_run:
                runs.append((start, i - 1))
            start = None
    return runs


labels, accession = [], {}
for line in open(rows_path):
    if line.startswith('#') or not line.strip():
        continue
    label, acc = line.rstrip('\n').split('\t')[:2]
    labels.append(label)
    accession[label] = acc

aligned, name = {}, None
for line in open(f'{out}/tardbp.afa'):
    if line.startswith('>'):
        name = line[1:].strip()
        aligned[name] = ''
    else:
        aligned[name] += line.strip()
ncols = len(aligned[REF])

# the model sequence against the row, residue by residue, before anything reads
# a position off either
plddt, row_data = {}, {}
for label in labels:
    seq, values = read_model(f'{out}/models/{accession[label]}.pdb')
    row = aligned[label].replace('-', '')
    if seq != row:
        raise SystemExit(f'{label}: model sequence differs from the row')
    plddt[label] = values
    mean = sum(values) / len(values)
    under_50 = sum(v < 50 for v in values)
    row_data[label] = {'meanPlddt': round(mean, 1), 'under50': under_50}
    print(f'  {label:12s} {accession[label]:12s} model {len(seq)} aa matches the row, '
          f'mean pLDDT {mean:5.1f}, {under_50} residues under 50')
json.dump(row_data, open(f'{out}/tardbp-rowdata.json', 'w'), indent=1)

# column of every residue of a row, through that row's gaps, and the value of
# every column of a row, with None where the row has a gap
columns = {
    label: [i for i, c in enumerate(aligned[label]) if c != '-']
    for label in labels
}
by_column = {}
for label in labels:
    values = iter(plddt[label])
    by_column[label] = [
        None if c == '-' else next(values) for c in aligned[label]
    ]

means, depth = [], []
for col in range(ncols):
    values = [by_column[label][col] for label in labels]
    values = [v for v in values if v is not None]
    means.append(round(sum(values) / len(values)))
    depth.append(len(values))
counts = [sum(band(m) == b for m in means) for b in range(4)]
print(f'columns by mean pLDDT band: {counts[3]} very high, {counts[2]} confident, '
      f'{counts[1]} low, {counts[0]} very low')
print(f'every column carries a residue from {min(depth)} to {max(depth)} of the {len(labels)} rows')

# the Pfam domains of the reference row, in its own residue numbering
pfam = json.load(open(f'{out}/tardbp-pfam.json'))
domains = sorted(
    (
        frag['start'],
        frag['end'],
        result['metadata']['accession'],
        result['metadata']['name'],
    )
    for result in pfam['results']
    for protein in result['proteins']
    for location in protein['entry_protein_locations']
    for frag in location['fragments']
)
SHORT = {
    'PF18694': 'TDP43_N',
    'PF00076': 'RRM',
    'PF20910': 'TDP43_C',
}
highlights, spans, domain_means = [], {}, {}
for start, end, acc, name in domains:
    short = SHORT[acc]
    if short == 'RRM':
        short = f'RRM{sum(k.startswith("RRM") for k in spans) + 1}'
    cols = columns[REF][start - 1:end]
    spans[short] = (cols[0], cols[-1])
    span = means[cols[0]:cols[-1] + 1]
    print(f'{short:8s} {acc} {REF} {start}-{end}: columns {cols[0] + 1}-{cols[-1] + 1}, '
          f'mean pLDDT {sum(span) / len(span):5.1f}')
    highlights.append({
        'row': REF,
        'start': start,
        'end': end,
        'label': f'{short} {start}-{end}',
        'color': 'rgba(78,121,167,0.18)',
    })
    domain_means[short] = sum(span) / len(span)

# inside the domain the mean is lowest over, the longest run of columns that
# rises out of the very low band
lowest = min(domain_means, key=domain_means.get)
first, last = spans[lowest]
runs, run = [], None
for col in range(first, last + 2):
    if col <= last and means[col] >= 50:
        run = col if run is None else run
    elif run is not None:
        runs.append((run, col - 1))
        run = None
longest = max(runs, key=lambda r: r[1] - r[0])
run_means = means[longest[0]:longest[1] + 1]


def ref_residue(col):
    """the residue of the reference row at or before a column"""
    return len(aligned[REF][:col + 1].replace('-', ''))


print(f'inside {lowest}, columns {longest[0] + 1}-{longest[1] + 1} rise to a mean of '
      f'{sum(run_means) / len(run_means):.0f}, which is {REF} residues '
      f'{ref_residue(longest[0])}-{ref_residue(longest[1])}')

# 7. a strip of the model's own pLDDT for three rows: the reference, the one
#    with the fewest residues under 50, and the one with the longest run under
#    50. A run shorter than five residues is a dip inside a fold, so the runs
#    printed are those of five and longer.
MIN_RUN = 5
runs = {label: runs_under_50(plddt[label], MIN_RUN) for label in labels}
fewest = min(labels, key=lambda label: row_data[label]['under50'])
longest_run = max(
    labels, key=lambda label: max(last - first for first, last in runs[label]))
strip_rows = list(dict.fromkeys([REF, fewest, longest_run]))
print(f'strips for {REF}, {fewest} with the fewest residues under 50 and '
      f'{longest_run} with the longest run under 50')
for label in strip_rows:
    spans_text = ', '.join(
        f'{columns[label][a] + 1}-{columns[label][b] + 1}' for a, b in runs[label])
    print(f'  {label:12s} runs of {MIN_RUN} or more under 50 at columns {spans_text}')

layers = {
    'columnTracks': [
        {
            'id': 'plddt-mean',
            'name': 'Mean pLDDT',
            'kind': 'bar',
            'values': means,
            'encoding': {'y': {'scale': {'domainMax': 100}}, 'color': PLDDT},
            'height': 60,
        },
        *(
            {
                'id': f'plddt-{label.lower()}',
                'name': f'{label} pLDDT',
                'kind': 'strip',
                'row': label,
                'values': plddt[label],
                'encoding': {'color': PLDDT},
            }
            for label in strip_rows
        ),
    ],
    'highlights': highlights,
    'rowPanels': [
        {
            'kind': 'bar',
            'header': 'residues < 50',
            'encoding': {'x': {'field': 'under50'}},
            'width': 130,
        },
    ],
}
json.dump(layers, open(f'{out}/tardbp-layers.json', 'w'), indent=1)

# 8. check the inference against the model files: the residue and the pLDDT
#    every row carries at one column inside RRM1 and one inside the C-terminal
#    region, read from the B-factor column of each PDB
probes = {
    'RRM1': spans['RRM1'][0] + 21,
    'TDP43_C': spans['TDP43_C'][0] + 44,
}
for name, col in probes.items():
    print(f'{name}, alignment column {col + 1} ({REF} residue {columns[REF].index(col) + 1}):')
    for label in labels:
        value = by_column[label][col]
        if value is None:
            print(f'  {label:12s} -')
        else:
            print(f'  {label:12s} {aligned[label][col]} {value:5.1f}')
PY

echo
echo "wrote $OUT/tardbp.afa, $OUT/tardbp.nwk, $OUT/tardbp-rowdata.json, $OUT/tardbp-layers.json"
