#!/usr/bin/env bash
# Build the norovirus GII dataset of docs/tutorials/norovirus_recombination.md:
# twelve complete genomes from NCBI, one whole-genome alignment, a tree per
# ORF, the ORFs of every genome as a GFF, a second GFF giving each genome's
# closer parent in 200-base windows, and two sliding-window identity tracks
# across the ORF1/ORF2 junction. Every step is the one the page shows.
#
#   bash build_norovirus_recombination.sh [rows.tsv] [outdir]
#
# Needs: curl, docker (pulls quay.io/biocontainers/mafft and
# quay.io/biocontainers/fasttree) and python3. Writes the row table itself if
# one is not supplied, so the script runs with no arguments.
set -euo pipefail

ROWS=${1:-noro-rows.tsv}
OUT=${2:-.}
mkdir -p "$OUT"
OUTABS=$(cd "$OUT" && pwd)

MAFFT_IMAGE=quay.io/biocontainers/mafft:7.525--h031d066_1
FASTTREE_IMAGE=quay.io/biocontainers/fasttree:2.2.0--h7b50bb2_1
EFETCH=https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi

# The polymerase donor, the capsid donor, the recombinant the page reads, and
# the non-recombinant row that is the control. Each is a label from the table
# below.
PARENT_A='GII.P16-GII.2/CN/2016'
PARENT_B='GII.Pe-GII.4/JP/2012'
QUERY='GII.P16-GII.4/US/2016'
CONTROL='GII.Pe-GII.4/US/2013'

# One row per genome: the label the viewer draws, the accession, and the
# genotype the record's own isolate name or note carries.
if [ ! -f "$ROWS" ]; then
  echo "writing $ROWS (twelve norovirus GII genomes)"
  cat > "$ROWS" <<'EOF'
GII.P16-GII.4/US/2016	MK773584.1	GII.P16-GII.4 Sydney
GII.P16-GII.4/US/2017	MK762638.1	GII.P16-GII.4 Sydney
GII.P16-GII.4/JP/2016	LC175468.1	GII.P16_GII.4_Sydney2012
GII.P16-GII.2/CN/2016	NC_039476.1	GII.P16-GII.2
GII.P16-GII.2/HK/2016	KY771081.1	GII.P16_GII.2
GII.P16-GII.2/US/2018	MK752935.1	GII.P16-GII.2
GII.P16-GII.2/RU/2017	MG892974.3	GII.P16-GII.2
GII.Pe-GII.4/JP/2012	KJ196281.1	GII.Pe_GII.4_Sydney2012
GII.Pe-GII.4/TW/2012	KJ196296.1	GII.Pe_GII.4_Sydney2012
GII.Pe-GII.4/US/2013	KY486271.1	GII.Pe-GII.4-Sydney
GII.P7-GII.6/UK/2015	NC_040876.1	GII.P7_GII.6
GII.P17-GII.17/KR/2015	NC_039475.1	GII.P17_GII.17
EOF
fi

# 1. one efetch for the twelve genomes and one for their GenBank records, then
#    a FASTA whose deflines are the labels and a GFF of each genome's three
#    ORFs in its own coordinates
ids=$(awk -F'\t' '!/^#/ && NF {printf "%s%s", sep, $2; sep=","}' "$ROWS")
curl -sf "$EFETCH?db=nuccore&id=$ids&rettype=fasta&retmode=text" -o "$OUT/noro-ncbi.fasta"
curl -sf "$EFETCH?db=nuccore&id=$ids&rettype=gb&retmode=text" -o "$OUT/noro-ncbi.gb"

python3 - "$ROWS" "$OUT/noro-ncbi.fasta" "$OUT/noro-ncbi.gb" "$OUT/noro.fasta" "$OUT/noro-orfs.gff" <<'PY'
import re
import sys

rows_path, fasta, gb, out_fasta, out_gff = sys.argv[1:6]

rows = []
for line in open(rows_path):
    if line.startswith('#') or not line.strip():
        continue
    label, acc, genotype = line.rstrip('\n').split('\t')[:3]
    rows.append((label, acc, genotype))

seqs, acc = {}, None
for line in open(fasta):
    if line.startswith('>'):
        acc = line[1:].split()[0]
        seqs[acc] = []
    elif acc:
        seqs[acc].append(line.strip())
seqs = {k: ''.join(v) for k, v in seqs.items()}

# the three CDS features of a norovirus genome, in order: the nonstructural
# polyprotein of ORF1, VP1 of ORF2 and VP2 of ORF3
ORFS = [
    ('ORF1', 'nonstructural polyprotein', '#4e79a7'),
    ('ORF2', 'VP1 capsid', '#e15759'),
    ('ORF3', 'VP2', '#8c8c8c'),
]
cds = {}
for record in open(gb).read().split('\n//\n'):
    version = re.search(r'^VERSION\s+(\S+)', record, re.M)
    if not version:
        continue
    spans = re.findall(r'^     CDS             (\d+)\.\.(\d+)$', record, re.M)
    cds[version.group(1)] = [(int(a), int(b)) for a, b in spans]

with open(out_fasta, 'w') as fh, open(out_gff, 'w') as g:
    g.write('##gff-version 3\n')
    for label, acc, genotype in rows:
        seq = seqs[acc]
        spans = cds[acc]
        if len(spans) != 3:
            raise SystemExit(f'{acc} has {len(spans)} CDS features, expected 3')
        fh.write(f'>{label}\n{seq}\n')
        orf1, orf2, orf3 = spans
        print(f'  {label:23s} {acc:12s} {len(seq)} nt  ORF1 {orf1[0]}-{orf1[1]}  '
              f'ORF2 {orf2[0]}-{orf2[1]}  ORF3 {orf3[0]}-{orf3[1]}  {genotype}')
        for (name, desc, color), (start, end) in zip(ORFS, spans):
            g.write(f'{label}\tGenBank\tCDS\t{start}\t{end}\t.\t+\t0\t'
                    f'Name={name};signature_desc={desc};'
                    f'color=%23{color[1:]}\n')

overlaps = {cds[acc][0][1] - cds[acc][1][0] + 1 for _, acc, _ in rows}
print(f'ORF1 and ORF2 overlap by {sorted(overlaps)} bases')
PY

# 2. align the twelve genomes. MAFFT --auto picks FFT-NS-2 for a set this size
docker run --rm -v "$OUTABS:/work" -w /work "$MAFFT_IMAGE" \
  mafft --auto --quiet --preservecase noro.fasta > "$OUT/noro.afa"

python3 - "$OUT/noro.afa" <<'PY'
import sys

seqs, name = {}, None
for line in open(sys.argv[1]):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = ''
    else:
        seqs[name] += line.strip()
cols = len(next(iter(seqs.values())))
gaps = sum(s.count('-') for s in seqs.values())
print(f'{len(seqs)} rows, {cols} columns, {gaps} gap characters')
PY

# MAFFT wraps its FASTA at 60 columns and writes the rows in input order.
# Unwrap it, because everything downstream reads one line per row
python3 - "$OUT/noro.afa" <<'PY'
import sys

path = sys.argv[1]
seqs, order, name = {}, [], None
for line in open(path):
    if line.startswith('>'):
        name = line[1:].strip()
        order.append(name)
        seqs[name] = ''
    else:
        seqs[name] += line.strip()
with open(path, 'w') as fh:
    for name in order:
        fh.write(f'>{name}\n{seqs[name]}\n')
PY

# 3. the columns each ORF covers, read off the reference row's own ORF spans,
#    and the two per-ORF alignments the trees come from
python3 - "$ROWS" "$OUT/noro.afa" "$OUT/noro-orfs.gff" "$OUT/noro-orf1.afa" "$OUT/noro-orf2.afa" "$OUT/noro-junction.afa" "$OUT/noro-columns.json" <<'PY'
import json
import sys

rows_path, afa, gff, orf1_out, orf2_out, junction_out, cols_out = sys.argv[1:8]
REFERENCE = 'GII.P16-GII.4/US/2016'
FLANK = 300

seqs, order, name = {}, [], None
for line in open(afa):
    if line.startswith('>'):
        name = line[1:].strip()
        order.append(name)
        seqs[name] = ''
    else:
        seqs[name] += line.strip()

# base of a row (1-based) -> alignment column (0-based)
columns = {
    row: [i for i, c in enumerate(seq) if c != '-'] for row, seq in seqs.items()
}

spans = {}
for line in open(gff):
    if line.startswith('#'):
        continue
    f = line.rstrip('\n').split('\t')
    spans.setdefault(f[0], {})[f[8].split(';')[0][5:]] = (int(f[3]), int(f[4]))

ref = spans[REFERENCE]
col = lambda base: columns[REFERENCE][base - 1]
orf1 = (col(ref['ORF1'][0]), col(ref['ORF1'][1]))
orf2 = (col(ref['ORF2'][0]), col(ref['ORF2'][1]))
junction = (orf2[0] - FLANK, orf2[0] + FLANK)
print(f'in the alignment, {REFERENCE} has ORF1 in columns {orf1[0] + 1}-{orf1[1] + 1} '
      f'and ORF2 in columns {orf2[0] + 1}-{orf2[1] + 1}')
print(f'the junction cut is columns {junction[0] + 1}-{junction[1]}, '
      f'{FLANK} columns either side of the first base of ORF2')


def write(path, start, end):
    with open(path, 'w') as fh:
        for row in order:
            fh.write(f'>{row}\n{seqs[row][start:end]}\n')


write(orf1_out, orf1[0], orf1[1] + 1)
write(orf2_out, orf2[0], orf2[1] + 1)
write(junction_out, junction[0], junction[1])
json.dump(
    {
        'reference': REFERENCE,
        'orf1': [orf1[0] + 1, orf1[1] + 1],
        'orf2': [orf2[0] + 1, orf2[1] + 1],
        'junction': [junction[0] + 1, junction[1]],
    },
    open(cols_out, 'w'),
    indent=2,
)
PY

# 4. a tree per ORF. A recombinant sits in one clade by its polymerase and in
#    another by its capsid, so a whole-genome tree would place it between the
#    two and the page loads the ORF2 tree
for orf in orf1 orf2; do
  docker run --rm -v "$OUTABS:/work" -w /work "$FASTTREE_IMAGE" \
    FastTree -nt -gtr -quiet -nosupport "noro-$orf.afa" > "$OUT/noro-$orf.nwk" 2> /dev/null
  python3 - "$OUT/noro-$orf.nwk" <<'PY'
import sys

path = sys.argv[1]
tree = open(path).read().replace('\n', '')
open(path, 'w').write(tree + '\n')
print(f'{path.split("/")[-1]}: {tree[:200]}')
PY
done

# 5. the identity of every row to each parent, in windows along the genome,
#    and the two sliding-window tracks across the junction
python3 - "$ROWS" "$OUT/noro.afa" "$OUT/noro-junction.afa" "$OUT/noro-columns.json" "$OUT/noro-parents.gff" "$OUT/noro-layers.json" "$PARENT_A" "$PARENT_B" "$QUERY" "$CONTROL" <<'PY'
import json
import sys
from urllib.parse import quote

(rows_path, afa, junction_afa, cols_path, parents_gff, layers_out,
 PARENT_A, PARENT_B, QUERY, CONTROL) = sys.argv[1:11]
WINDOW = 200
TRACK_WINDOW = 100
A_COLOR = '#4e79a7'
B_COLOR = '#e15759'
TIE_COLOR = '#bab0ac'


def read(path):
    seqs, order, name = {}, [], None
    for line in open(path):
        if line.startswith('>'):
            name = line[1:].strip()
            order.append(name)
            seqs[name] = ''
        else:
            seqs[name] += line.strip()
    return seqs, order


seqs, order = read(afa)
cols = json.load(open(cols_path))


def identity(query, subject, start, end):
    """percent identity over columns [start, end), counting the columns where
    both rows carry a base"""
    q, s = seqs[query], seqs[subject]
    both = matches = 0
    for i in range(start, end):
        if q[i] != '-' and s[i] != '-':
            both += 1
            matches += q[i] == s[i]
    return 100 * matches / both if both else 0


# every row's closer parent in windows of the row's own bases, as a GFF the
# overlay colors: blue where the window is closer to the polymerase donor, red
# where it is closer to the capsid donor
with open(parents_gff, 'w') as g:
    g.write('##gff-version 3\n')
    for row in order:
        if row in (PARENT_A, PARENT_B):
            continue
        positions = [i for i, c in enumerate(seqs[row]) if c != '-']
        for base in range(0, len(positions), WINDOW):
            block = positions[base:base + WINDOW]
            a = identity(row, PARENT_A, block[0], block[-1] + 1)
            b = identity(row, PARENT_B, block[0], block[-1] + 1)
            closer, color = (
                ('GII.P16', A_COLOR) if a - b > 1
                else ('GII.4 Sydney', B_COLOR) if b - a > 1
                else ('tie', TIE_COLOR)
            )
            g.write(f'{row}\twindow\tmatch\t{base + 1}\t{base + len(block)}\t'
                    f'{a - b:.1f}\t.\t.\tName={closer};'
                    f'signature_desc=closer to {closer};color=%23{color[1:]}\n')

# the breakpoint: the last window of the recombinant closer to the polymerase
# donor, and the first closer to the capsid donor
STEP = 25
width = len(seqs[QUERY])
signs = []
for start in range(0, width - WINDOW, STEP):
    a = identity(QUERY, PARENT_A, start, start + WINDOW)
    b = identity(QUERY, PARENT_B, start, start + WINDOW)
    signs.append((start + WINDOW // 2, a - b))
last_a = max(c for c, d in signs if d > 0)
first_b = min(c for c, d in signs if d < 0 and c > last_a)
print(f'{QUERY}: the last {WINDOW}-column window closer to {PARENT_A} is centered on '
      f'column {last_a + 1}, the first closer to {PARENT_B} on column {first_b + 1}')
print(f'ORF2 starts at column {cols["orf2"][0]}')

for row in (QUERY, CONTROL):
    a1 = identity(row, PARENT_A, cols['orf1'][0] - 1, cols['orf1'][1])
    b1 = identity(row, PARENT_B, cols['orf1'][0] - 1, cols['orf1'][1])
    a2 = identity(row, PARENT_A, cols['orf2'][0] - 1, cols['orf2'][1])
    b2 = identity(row, PARENT_B, cols['orf2'][0] - 1, cols['orf2'][1])
    print(f'{row:23s} ORF1 {a1:5.1f}% to {PARENT_A}, {b1:5.1f}% to {PARENT_B}   '
          f'ORF2 {a2:5.1f}% and {b2:5.1f}%')

# the two tracks: the identity of one row to each parent in a sliding window,
# one value per column of the junction cut, as integers under max 100
junction, _ = read(junction_afa)
offset = cols['junction'][0] - 1


def track_values(row, subject):
    values = []
    for i in range(len(junction[row])):
        center = offset + i
        start = max(0, center - TRACK_WINDOW // 2)
        values.append(round(identity(row, subject, start, start + TRACK_WINDOW)))
    return values


tracks = []
for row, tag in ((QUERY, 'query'), (CONTROL, 'control')):
    for subject, color, parent in (
        (PARENT_A, A_COLOR, 'polymerase donor'),
        (PARENT_B, B_COLOR, 'capsid donor'),
    ):
        tracks.append({
            'id': f'{tag}-{"a" if subject == PARENT_A else "b"}',
            'name': f'{row} to {subject}',
            'kind': 'bar',
            'values': track_values(row, subject),
            'max': 100,
            'color': color,
            'height': 60,
        })
        print(f'{row} to {subject} ({parent}): {len(tracks[-1]["values"])} values, '
              f'{min(tracks[-1]["values"])}-{max(tracks[-1]["values"])}%')

# where a pair of curves changes rank inside the cut, in the cut's own columns
def rank_changes(a, b):
    d = [x - y for x, y in zip(a, b)]
    return [
        i for i in range(1, len(d))
        if d[i - 1] > 0 >= d[i] or d[i - 1] < 0 <= d[i]
    ]


crossings = rank_changes(tracks[0]['values'], tracks[1]['values'])
print(f'in the junction cut the {QUERY} curves change rank at column '
      f'{", ".join(str(c + 1) for c in crossings)} of {len(tracks[0]["values"])}, '
      f'column {offset + crossings[0] + 1} of the whole alignment')
ca, cb = tracks[2]['values'], tracks[3]['values']
print(f'the {CONTROL} curves change rank at {len(rank_changes(ca, cb))} columns of the cut; '
      f'that row reads {min(cb)}-{max(cb)}% to {PARENT_B} and {min(ca)}-{max(ca)}% to {PARENT_A}')

pair = quote(json.dumps(tracks[:2], separators=(',', ':')))
print(f'the two {QUERY} tracks take {len(pair)} characters of a URL-encoded link, '
      f'under the 8192-character request line the server answers')

json.dump(
    {
        'columns': cols,
        'parentA': PARENT_A,
        'parentB': PARENT_B,
        'query': QUERY,
        'control': CONTROL,
        'crossColumn': offset + crossings[0] + 1,
        'trackWindow': TRACK_WINDOW,
        'columnTracks': tracks,
    },
    open(layers_out, 'w'),
    indent=2,
)
PY

# 6. check it against the raw data: the bases the recombinant shares with each
#    parent in the 500 columns before and after the crossing
python3 - "$OUT/noro.afa" "$OUT/noro-layers.json" <<'PY'
import json
import sys

afa, layers_path = sys.argv[1:3]
SPAN = 500

seqs, name = {}, None
for line in open(afa):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = ''
    else:
        seqs[name] += line.strip()

layers = json.load(open(layers_path))
cross = layers['crossColumn']
A, B, Q, C = (layers[k] for k in ('parentA', 'parentB', 'query', 'control'))


def counts(row, subject, start, end):
    q, s = seqs[row], seqs[subject]
    both = diff = 0
    for i in range(start, end):
        if q[i] != '-' and s[i] != '-':
            both += 1
            diff += q[i] != s[i]
    return diff, both


for row in (Q, C):
    for label, (start, end) in (
        (f'the {SPAN} columns before {cross}', (cross - 1 - SPAN, cross - 1)),
        (f'the {SPAN} columns after {cross}', (cross - 1, cross - 1 + SPAN)),
    ):
        da, na = counts(row, A, start, end)
        db, nb = counts(row, B, start, end)
        print(f'{row:23s} {label}: {da}/{na} differences to {A}, '
              f'{db}/{nb} to {B}')
PY

echo
echo "wrote $OUT/noro.afa, $OUT/noro-orf1.nwk, $OUT/noro-orf2.nwk, $OUT/noro-orfs.gff,"
echo "      $OUT/noro-parents.gff, $OUT/noro-junction.afa, $OUT/noro-layers.json"
