#!/usr/bin/env bash
# Build the coronavirus spike alignment, tree, domain GFF and structure layers
# of docs/tutorials/spike_structure.md. Every step is the one the page shows.
#
#   bash build_spike_structure.sh [rows.tsv] [outdir]
#
# Needs: curl, python3, mafft, FastTree, and react-msaview-cli on PATH
# (npm install -g react-msaview-cli). Writes the row table itself if one is not
# supplied, so the script runs with no arguments.
set -euo pipefail

ROWS=${1:-rows.tsv}
OUT=${2:-.}
mkdir -p "$OUT"

FASTTREE=${FASTTREE:-$(command -v FastTree || command -v fasttree || echo FastTree)}
CLI=${CLI:-react-msaview-cli}
PDB=6vxx
CHAIN=A
EFETCH=https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi

# One row per virus: the NCBI protein the alignment uses, the label the viewer
# draws, and the UniProtKB entry for the same protein when there is one. The
# third column is what InterPro's precomputed matches are keyed by; a `-` means
# nobody has deposited this isolate's spike in UniProtKB.
if [ ! -f "$ROWS" ]; then
  echo "writing $ROWS (spike glycoprotein across coronaviruses)"
  cat > "$ROWS" <<'EOF'
YP_009724390.1	SARS-CoV-2	P0DTC2
QHR63300.2	RaTG13	A0ABF7PLN6
UAY13217.1	BANAL-20-52	-
QIA48632.1	Pangolin-GX	-
NP_828851.1	SARS-CoV	P59594
YP_009047204.1	MERS-CoV	K9N5Q8
YP_001039953.1	HKU4	A3EX94
YP_173238.1	HKU1	Q0ZME7
YP_009555241.1	OC43	P36334
NP_073551.1	229E	P15423
YP_003767.1	NL63	Q6Q1S2
EOF
fi

# 1. one efetch for every accession, relabelled by virus. The label travels all
#    the way through: FASTA defline, tree tip, GFF seq_id, and the `row` field
#    of every layer.
ids=$(awk -F'\t' '!/^#/ && NF {printf "%s%s", sep, $1; sep=","}' "$ROWS")
curl -sf "$EFETCH?db=protein&id=$ids&rettype=fasta&retmode=text" -o "$OUT/spike-ncbi.fasta"

python3 - "$ROWS" "$OUT/spike-ncbi.fasta" "$OUT/spike.fasta" <<'PY'
import sys

rows, fetched, out = sys.argv[1:4]
label = {}
for line in open(rows):
    if line.startswith('#') or not line.strip():
        continue
    acc, name = line.rstrip('\n').split('\t')[:2]
    label[acc] = name

seqs, acc = {}, None
for line in open(fetched):
    if line.startswith('>'):
        acc = line[1:].split()[0]
        seqs[acc] = []
    elif acc:
        seqs[acc].append(line.strip())

missing = [a for a in label if a not in seqs]
if missing:
    raise SystemExit(f'efetch returned nothing for {missing}')

with open(out, 'w') as fh:
    for acc, name in label.items():
        seq = ''.join(seqs[acc])
        fh.write(f'>{name}\n{seq}\n')
        print(f'  {name:12s} {acc:16s} {len(seq)} aa')
PY

# 2. align. --auto picks the strategy from the input size; on eleven spikes it
#    chooses L-INS-i, which is accurate and slow enough to notice
mafft --auto "$OUT/spike.fasta" > "$OUT/spike-wrapped.afa"
python3 - "$OUT/spike-wrapped.afa" "$OUT/spike.afa" <<'PY'
import sys

src, out = sys.argv[1:3]
with open(out, 'w') as fh:
    name, seq = None, []
    for line in open(src):
        if line.startswith('>'):
            if name:
                fh.write(f'>{name}\n{"".join(seq)}\n')
            name, seq = line[1:].strip(), []
        else:
            seq.append(line.strip())
    fh.write(f'>{name}\n{"".join(seq)}\n')
    print(f'{len("".join(seq))} columns')
PY
rm -f "$OUT/spike-wrapped.afa"

# 3. tree. -lg is the amino-acid substitution model; FastTree writes the Newick
#    on stdout and its progress on stderr
"$FASTTREE" -lg -quiet "$OUT/spike.afa" > "$OUT/spike.nwk"

# 4. domains, from InterPro's precomputed matches. Those are keyed by UniProtKB
#    sequence, and the alignment rows are NCBI records, so a row only gets
#    domains when the two records are the same protein. A length difference
#    means an indel between them, which shifts every boundary after it, so the
#    check is the gate rather than a warning.
python3 - "$ROWS" "$OUT/spike.fasta" "$OUT/spike-uniprot.tsv" <<'PY'
import sys
import urllib.request

rows, fasta, out = sys.argv[1:4]

seqs, name = {}, None
for line in open(fasta):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = ''
    else:
        seqs[name] += line.strip()

kept = []
for line in open(rows):
    if line.startswith('#') or not line.strip():
        continue
    _, name, acc = line.rstrip('\n').split('\t')[:3]
    if acc == '-':
        print(f'  {name:12s} no UniProtKB entry, so no precomputed matches')
        continue
    url = f'https://rest.uniprot.org/uniprotkb/{acc}.fasta'
    with urllib.request.urlopen(url) as fh:
        text = fh.read().decode()
    unp = ''.join(text.split('\n')[1:])
    row = seqs[name]
    if len(unp) != len(row):
        print(f'  {name:12s} {acc} is {len(unp)} aa against the row\'s {len(row)}, so its numbering is not the row\'s: dropped')
        continue
    diff = sum(1 for a, b in zip(row, unp) if a != b)
    print(f'  {name:12s} {acc} same length, {diff} substitution(s)')
    kept.append((acc, name))

with open(out, 'w') as fh:
    for acc, name in kept:
        fh.write(f'{acc}\t{name}\n')
print(f'{len(kept)} rows can carry InterPro coordinates')
PY

$CLI interpro "$OUT/spike-uniprot.tsv" -o "$OUT/spike-domains.gff"

# 5. the layers: UniProt's feature table as labeled highlights, and SIFTS plus
#    PDBe's polymer coverage as the row-to-structure correspondence. Both are
#    lookups against one accession and one entry, and both arrive as data the
#    viewer draws rather than as anything it computes.
python3 - "$OUT/spike.fasta" "$PDB" "$CHAIN" "$OUT/spike-layers.json" <<'PY'
import datetime
import json
import sys
import urllib.request

fasta, pdb, chain, out = sys.argv[1:5]
ROW = 'SARS-CoV-2'
ACC = 'P0DTC2'


def get(url):
    with urllib.request.urlopen(url) as fh:
        return json.load(fh)


seqs, name = {}, None
for line in open(fasta):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = ''
    else:
        seqs[name] += line.strip()
row = seqs[ROW]

entry = get(f'https://rest.uniprot.org/uniprotkb/{ACC}.json')
if entry['sequence']['value'] != row:
    raise SystemExit(
        f'{ROW} is not {ACC}: every position below would be off by an unknown amount'
    )

# UniProt regions, in the row's own residue coordinates, which is what a
# highlight with a `row` expects
wanted = {
    'Receptor-binding domain (RBD)': 'RBD',
    'Receptor-binding motif; binding to human ACE2': 'RBM',
    'Fusion peptide 1': 'Fusion peptide',
    'Heptad repeat 1': 'HR1',
    'Heptad repeat 2': 'HR2',
    'Cleavage; by host furin': 'Furin cleavage',
}
highlights = []
for feature in entry['features']:
    name = wanted.get(feature.get('description', ''))
    if name:
        start = feature['location']['start']['value']
        end = feature['location']['end']['value']
        highlights.append({'row': ROW, 'start': start, 'end': end, 'label': name})

# the insert itself is not a UniProt feature: it is where this sequence has
# four residues its relatives do not, so read it off the sequence
INSERT = 'PRRA'
at = row.find(INSERT) + 1
highlights.append(
    {'row': ROW, 'start': at, 'end': at + len(INSERT) - 1, 'label': f'{INSERT} insert'}
)
highlights.sort(key=lambda h: h['start'])
for h in highlights:
    print(f'  {h["label"]:16s} {h["start"]}-{h["end"]}')

# SIFTS: the authority for how this entry numbers its residues against UniProt
sifts = get(f'https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/{pdb}')
mappings = sifts[pdb]['UniProt'][ACC]['mappings']
segments = [
    {
        'rowStart': m['unp_start'],
        'rowEnd': m['unp_end'],
        'structStart': m['start']['residue_number'],
        'structEnd': m['end']['residue_number'],
    }
    for m in mappings
    if m['chain_id'] == chain
]
segments.sort(key=lambda s: s['rowStart'])
for s in segments:
    print(
        f'  SIFTS row {s["rowStart"]}-{s["rowEnd"]} is {pdb.upper()} {s["structStart"]}-{s["structEnd"]}'
        f' (offset {s["structStart"] - s["rowStart"]})'
    )

# what the entity actually is, which is where the offset comes from: the
# deposited construct is not the protein, and SIFTS reports the identity it
# found rather than asserting the two are the same sequence
molecule = get(f'https://www.ebi.ac.uk/pdbe/api/pdb/entry/molecules/{pdb}')[pdb][0]
entity = molecule['sequence']
identity = next(m['identity'] for m in mappings if m['chain_id'] == chain)
print(f'  the entity is {len(entity)} residues, identity {identity} to {ACC}')
for s in segments:
    print(
        f'  {s["structStart"] - 1} residues before the mapped region and'
        f' {len(entity) - s["structEnd"]} after it belong to no part of {ACC}'
    )
    for pos in range(s['structStart'], s['structEnd'] + 1):
        here, there = entity[pos - 1], row[pos - s['structStart'] + s['rowStart'] - 1]
        if here != there:
            print(
                f'  {pdb.upper()} {pos} is {here} where row residue'
                f' {pos - s["structStart"] + s["rowStart"]} is {there}'
            )

# the residues the entity declares and the crystallographers could not resolve
coverage = get(
    f'https://www.ebi.ac.uk/pdbe/api/pdb/entry/polymer_coverage/{pdb}/chain/{chain}'
)
observed = set()
spans = []
for mol in coverage[pdb]['molecules']:
    for ch in mol['chains']:
        for span in ch['observed']:
            spans.append(span)
            observed.update(
                range(span['start']['residue_number'], span['end']['residue_number'] + 1)
            )
first = spans[0]['start']
print(
    f'  {len(spans)} observed stretches; the first starts at label_seq_id'
    f' {first["residue_number"]}, which the entry\'s author numbering calls'
    f' {first["author_residue_number"]}'
)

unobserved = []
for segment in segments:
    for pos in range(segment['structStart'], segment['structEnd'] + 1):
        if pos in observed:
            continue
        if unobserved and unobserved[-1][1] == pos - 1:
            unobserved[-1][1] = pos
        else:
            unobserved.append([pos, pos])

mapping = {
    'row': ROW,
    'accession': ACC,
    'structure': {
        'id': pdb.upper(),
        'kind': 'experimental',
        'asymId': chain,
        'url': f'https://files.rcsb.org/download/{pdb.upper()}.cif',
    },
    'segments': segments,
    'unobserved': unobserved,
    'rowLength': len(row),
    'generated': {
        'by': 'sifts',
        'date': datetime.date.today().isoformat(),
    },
}

# the same correspondence as something the viewer draws: one character per
# residue of the row, which `row` on a text track puts on that residue's column
state = []
for pos in range(1, len(row) + 1):
    segment = next(
        (s for s in segments if s['rowStart'] <= pos <= s['rowEnd']),
        None,
    )
    if segment is None:
        state.append('N')
    else:
        struct = segment['structStart'] + pos - segment['rowStart']
        state.append('O' if struct in observed else 'U')
state = ''.join(state)

counts = {c: state.count(c) for c in 'OUN'}
print(
    f'  {counts["O"]} residues observed, {counts["U"]} declared and not resolved,'
    f' {counts["N"]} outside the construct'
)
for h in highlights:
    window = state[h['start'] - 1 : h['end']]
    print(
        f'  {h["label"]:16s} {window.count("O")} observed,'
        f' {window.count("U")} not resolved, {window.count("N")} outside'
    )

track = {
    'id': f'{pdb}-coverage',
    'name': f'{pdb.upper()} chain {chain}',
    'kind': 'text',
    'row': ROW,
    'data': state,
    'colors': {'O': '#2e7d32', 'U': '#e65100', 'N': '#cfd8dc'},
    'height': 16,
}

json.dump(
    {'columnTracks': [track], 'highlights': highlights, 'residueMappings': [mapping]},
    open(out, 'w'),
    indent=2,
)
PY

# 6. check the figures against the raw data. The insertion the page is about is
#    a substring of one row and a gap in every other, and the loop that carries
#    it is a range the structure declares and did not resolve.
python3 - "$OUT/spike.fasta" "$OUT/spike.afa" "$OUT/spike-layers.json" <<'PY'
import json
import sys

fasta, afa, layers = sys.argv[1:4]
ROW = 'SARS-CoV-2'
INSERT = 'PRRA'


def read(path):
    seqs, name = {}, None
    for line in open(path):
        if line.startswith('>'):
            name = line[1:].strip()
            seqs[name] = ''
        else:
            seqs[name] += line.strip()
    return seqs


rows = read(fasta)
aln = read(afa)
row = rows[ROW]

at = row.find(INSERT) + 1
print(f'{INSERT} is at residues {at}-{at + len(INSERT) - 1} of {ROW}')

# the residue positions of the insert, projected through the row's own gaps
cols, residue = [], 0
for i, char in enumerate(aln[ROW]):
    if char != '-':
        residue += 1
        if at <= residue <= at + len(INSERT) - 1:
            cols.append(i)
first, last = cols[0], cols[-1]
print(f'  alignment columns {first + 1}-{last + 1}')
for col in cols:
    letters = ''.join(
        seq[col] for name, seq in aln.items() if name != ROW and seq[col] != '-'
    )
    print(
        f'  column {col + 1} is {aln[ROW][col]} here and gap in'
        f' {len(aln) - 1 - len(letters)} of the {len(aln) - 1} other rows'
        f'{f", {letters} in the rest" if letters else ""}'
    )

data = json.load(open(layers))
mapping = data['residueMappings'][0]
segment = mapping['segments'][0]
offset = segment['structStart'] - segment['rowStart']
for start, end in mapping['unobserved']:
    if start <= at + offset <= end:
        print(
            f'  {mapping["structure"]["id"]} declares {start}-{end}'
            f' (row {start - offset}-{end - offset}) and resolved none of it'
        )

# the control: a region of the same row, in the same structure, that comes out
# unremarkable
state = data['columnTracks'][0]['data']
for label in ('HR1', 'RBM'):
    h = next(x for x in data['highlights'] if x['label'] == label)
    window = state[h['start'] - 1 : h['end']]
    print(
        f'{label} is row {h["start"]}-{h["end"]}, structure'
        f' {h["start"] + offset}-{h["end"] + offset}:'
        f' {window.count("O")}/{len(window)} observed'
    )
PY

echo
echo "wrote $OUT/spike.afa, $OUT/spike.nwk, $OUT/spike-domains.gff, $OUT/spike-layers.json"
