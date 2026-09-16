#!/usr/bin/env bash
# Build the hemoglobin alignment of docs/tutorials/protein_complex.md: alpha and
# beta subunits from eleven vertebrates, each aligned on its own and the two
# concatenated per species, with a tree, a GFF marking the subunits, and the
# residue contacts between the chains of PDB 2HHB as layers. Every step is the
# one the page shows.
#
#   bash build_protein_complex.sh [rows.tsv] [outdir]
#
# Needs: curl, clustalw, and python3 with biopython. Writes the row table
# itself if one is not supplied, so the script runs with no arguments.
set -euo pipefail

ROWS=${1:-rows.tsv}
OUT=${2:-.}
mkdir -p "$OUT"

PDB=2hhb
EFETCH=https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi

# One row per species: the label the viewer draws, then the RefSeq protein for
# the alpha subunit and for the beta subunit.
if [ ! -f "$ROWS" ]; then
  echo "writing $ROWS (hemoglobin alpha and beta across vertebrates)"
  cat > "$ROWS" <<'EOF'
Human	NP_000549.1	NP_000509.1
Macaque	NP_001038189.1	NP_001157900.1
Mouse	NP_032244.2	NP_001188320.1
Rat	NP_001007723.1	NP_942071.2
Cow	NP_001070890.2	NP_776342.1
Pig	NP_001432111.1	NP_001138313.1
Horse	NP_001078901.1	NP_001157490.1
Platypus	XP_028905054.1	XP_028913684.1
Chicken	NP_001004376.1	NP_990820.1
Zebrafish	NP_571332.3	NP_001003431.2
Trout	NP_001118023.1	XP_021413554.1
EOF
fi

# 1. one efetch for all 22 accessions, then one FASTA per subunit with the
#    species label as the defline, so the two files pair up by name
ids=$(awk -F'\t' '!/^#/ && NF {printf "%s%s,%s", sep, $2, $3; sep=","}' "$ROWS")
curl -sf "$EFETCH?db=protein&id=$ids&rettype=fasta&retmode=text" -o "$OUT/globins-ncbi.fasta"

python3 - "$ROWS" "$OUT/globins-ncbi.fasta" "$OUT/alpha.fasta" "$OUT/beta.fasta" <<'PY'
import sys

rows, fetched, alpha_out, beta_out = sys.argv[1:5]

seqs, acc = {}, None
for line in open(fetched):
    if line.startswith('>'):
        acc = line[1:].split()[0]
        seqs[acc] = []
    elif acc:
        seqs[acc].append(line.strip())
seqs = {k: ''.join(v) for k, v in seqs.items()}

with open(alpha_out, 'w') as alpha, open(beta_out, 'w') as beta:
    for line in open(rows):
        if line.startswith('#') or not line.strip():
            continue
        label, a, b = line.rstrip('\n').split('\t')[:3]
        missing = [x for x in (a, b) if x not in seqs]
        if missing:
            raise SystemExit(f'efetch returned nothing for {missing}')
        alpha.write(f'>{label}\n{seqs[a]}\n')
        beta.write(f'>{label}\n{seqs[b]}\n')
        print(f'  {label:10s} alpha {a:15s} {len(seqs[a])} aa   beta {b:15s} {len(seqs[b])} aa')
PY

# 2. align each subunit on its own. -OUTORDER=INPUT keeps the rows in the
#    table's order, and ClustalW wraps the FASTA, which the next step unwraps
for sub in alpha beta; do
  clustalw -INFILE="$OUT/$sub.fasta" -ALIGN -TYPE=PROTEIN -OUTORDER=INPUT \
    -OUTPUT=FASTA -OUTFILE="$OUT/$sub.afa" > /dev/null
done

# 3. concatenate alpha and beta per species, and write the subunit spans as a
#    GFF in each row's own residue numbering, so the overlay marks where one
#    chain ends and the next begins
python3 - "$OUT/alpha.afa" "$OUT/beta.afa" "$OUT/hemoglobin.afa" "$OUT/hemoglobin-subunits.gff" <<'PY'
import sys

alpha_afa, beta_afa, out, gff = sys.argv[1:5]


def read(path):
    seqs, name = {}, None
    for line in open(path):
        if line.startswith('>'):
            name = line[1:].strip()
            seqs[name] = ''
        else:
            seqs[name] += line.strip()
    return seqs


alpha = read(alpha_afa)
beta = read(beta_afa)
alpha_cols = len(next(iter(alpha.values())))
beta_cols = len(next(iter(beta.values())))
print(f'alpha: {alpha_cols} columns, beta: {beta_cols} columns')
print(f'concatenated: {alpha_cols + beta_cols} columns, beta starts at column {alpha_cols + 1}')

with open(out, 'w') as fh, open(gff, 'w') as g:
    g.write('##gff-version 3\n')
    for name, a in alpha.items():
        b = beta[name]
        fh.write(f'>{name}\n{a}{b}\n')
        alen = len(a.replace('-', ''))
        blen = len(b.replace('-', ''))
        g.write(f'{name}\tRefSeq\tpolypeptide_region\t1\t{alen}\t.\t.\t.\tName=alpha;signature_desc=hemoglobin subunit alpha;color=%234e79a7\n')
        g.write(f'{name}\tRefSeq\tpolypeptide_region\t{alen + 1}\t{alen + blen}\t.\t.\t.\tName=beta;signature_desc=hemoglobin subunit beta;color=%23e15759\n')
PY

# 4. neighbor-joining tree from the concatenation. ClustalW wraps the Newick
#    across lines; strip the whitespace so it is one string
clustalw -INFILE="$OUT/hemoglobin.afa" -TREE -TYPE=PROTEIN \
  -OUTPUTTREE=phylip > /dev/null
tr -d '[:space:]' < "$OUT/hemoglobin.ph" > "$OUT/hemoglobin.nwk"
rm -f "$OUT/hemoglobin.ph"

# 5. the structure. 2HHB is the human deoxy tetramer, chains A and C alpha,
#    B and D beta. Chain A touches B across the alpha1beta1 interface and D
#    across alpha1beta2, and both are read off the coordinates as residue
#    pairs with a heavy atom of each within 4 A.
curl -sf "https://files.rcsb.org/download/${PDB^^}.cif" -o "$OUT/$PDB.cif"

python3 - "$OUT/hemoglobin.afa" "$OUT/$PDB.cif" "$OUT/hemoglobin-layers.json" <<'PY'
import datetime
import json
import sys

from Bio.PDB import MMCIFParser, NeighborSearch
from Bio.PDB.Polypeptide import index_to_one, three_to_index
from Bio.PDB.SASA import ShrakeRupley

afa, cif, out = sys.argv[1:4]
ROW = 'Human'
PDB = '2HHB'
CUTOFF = 4.0
# Tien et al. 2013, the theoretical maximum accessible area per residue type
MAX_ASA = {
    'ALA': 129, 'ARG': 274, 'ASN': 195, 'ASP': 193, 'CYS': 167, 'GLN': 225,
    'GLU': 223, 'GLY': 104, 'HIS': 224, 'ILE': 197, 'LEU': 201, 'LYS': 236,
    'MET': 224, 'PHE': 240, 'PRO': 159, 'SER': 155, 'THR': 172, 'TRP': 285,
    'TYR': 263, 'VAL': 174,
}

seqs, name = {}, None
for line in open(afa):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = ''
    else:
        seqs[name] += line.strip()
row = seqs[ROW].replace('-', '')

structure = MMCIFParser(QUIET=True).get_structure(PDB, cif)
model = structure[0]
for chain in model:
    for res in list(chain):
        if res.id[0] != ' ':
            chain.detach_child(res.id)
chains = {c.id: c for c in model}


def sequence(chain):
    return ''.join(index_to_one(three_to_index(r.get_resname())) for r in chain)


# The RefSeq rows keep the initiator methionine and the mature chains in the
# crystal do not, so chain residue n is row residue n + 1 within its subunit.
# Check that residue by residue before trusting any number that follows.
a_seq, b_seq = sequence(chains['A']), sequence(chains['B'])
a_start = row.find(a_seq)
b_start = row.find(b_seq)
if a_start < 0 or b_start < 0:
    raise SystemExit(f'{PDB} chains do not match the {ROW} row')
alpha_len = b_start - 1
print(f'chain A ({len(a_seq)} aa) is row residues {a_start + 1}-{a_start + len(a_seq)} of {ROW}, chain B ({len(b_seq)} aa) is {b_start + 1}-{b_start + len(b_seq)}')
print(f'the {ROW} row is {len(row)} residues: alpha 1-{alpha_len}, beta {alpha_len + 1}-{len(row)}')


def row_pos(chain_id, struct_pos):
    offset = a_start if chain_id in 'AC' else b_start
    return offset + struct_pos


def contacts(c1, c2):
    ns = NeighborSearch([a for r in c2 for a in r])
    pairs = set()
    for r in c1:
        for atom in r:
            for other in ns.search(atom.coord, CUTOFF):
                pairs.add((r.id[1], other.get_parent().id[1]))
    return sorted(pairs)


interfaces = {
    'alpha1beta1': contacts(chains['A'], chains['B']),
    'alpha1beta2': contacts(chains['A'], chains['D']),
}
for label, pairs in interfaces.items():
    print(f'{label}: {len(pairs)} residue pairs within {CUTOFF} A, {len({p[0] for p in pairs})} alpha residues and {len({p[1] for p in pairs})} beta residues')

# exposure in the assembled tetramer, for the residues at neither interface
sr = ShrakeRupley()
sr.compute(model, level='R')
exposure = {}
for cid in 'AB':
    for res in chains[cid]:
        exposure[(cid, res.id[1])] = res.sasa / MAX_ASA[res.get_resname()]

CLASS_COLORS = {
    '1': '#4e79a7',
    '2': '#e15759',
    'B': '#8c8c8c',
    'E': '#f1ce63',
    'O': '#ffffff',
}
classes = ['O'] * len(row)
for (cid, n), rel in exposure.items():
    classes[row_pos(cid, n) - 1] = 'B' if rel < 0.1 else 'E' if rel > 0.25 else 'O'
for code, (label, pairs) in zip('12', interfaces.items()):
    for a, b in pairs:
        classes[row_pos('A', a) - 1] = code
        classes[row_pos('B', b) - 1] = code
classes = ''.join(classes)
counts = {c: classes.count(c) for c in '12BEO'}
print(f'residue classes on the {ROW} row: {counts["1"]} at alpha1beta1, {counts["2"]} at alpha1beta2, {counts["B"]} buried, {counts["E"]} exposed, {counts["O"]} in between')

arcs = [
    {'start': row_pos('A', a), 'end': row_pos('B', b), 'color': CLASS_COLORS[code]}
    for code, pairs in zip('12', interfaces.values())
    for a, b in pairs
]
mappings = [
    {
        'row': ROW,
        'accession': acc,
        'structure': {
            'id': PDB,
            'kind': 'experimental',
            'asymId': cid,
            'url': f'https://files.rcsb.org/download/{PDB}.cif',
        },
        'segments': [
            {
                'rowStart': start + 1,
                'rowEnd': start + len(seq),
                'structStart': 1,
                'structEnd': len(seq),
            }
        ],
        'unobserved': [],
        'rowLength': len(row),
        'generated': {'by': 'sequence match', 'date': datetime.date.today().isoformat()},
    }
    for cid, acc, start, seq in (
        ('A', 'NP_000549.1', a_start, a_seq),
        ('B', 'NP_000509.1', b_start, b_seq),
    )
]
layers = {
    'columnTracks': [
        {
            'id': f'{PDB.lower()}-contacts',
            'name': f'{PDB} chain contacts',
            'kind': 'arc',
            'row': ROW,
            'arcs': arcs,
            'height': 70,
        },
        {
            'id': f'{PDB.lower()}-class',
            'name': f'{PDB} residue class',
            'kind': 'text',
            'row': ROW,
            'data': classes,
            'colors': CLASS_COLORS,
            'height': 16,
        },
    ],
    'residueMappings': mappings,
}
json.dump(layers, open(out, 'w'), indent=2)
PY

# 6. how conserved each class of residue is across the eleven rows, read off
#    the alignment: for every residue of the Human row, the share of the other
#    rows carrying the same letter in that column
python3 - "$OUT/hemoglobin.afa" "$OUT/hemoglobin-layers.json" <<'PY'
import json
import sys

afa, layers_path = sys.argv[1:3]
ROW = 'Human'

seqs, name = {}, None
for line in open(afa):
    if line.startswith('>'):
        name = line[1:].strip()
        seqs[name] = ''
    else:
        seqs[name] += line.strip()
others = [s for n, s in seqs.items() if n != ROW]

layers = json.load(open(layers_path))
classes = next(t for t in layers['columnTracks'] if t['kind'] == 'text')['data']

# column of every residue of the row, through its gaps
cols = [i for i, c in enumerate(seqs[ROW]) if c != '-']
identity = [
    sum(s[col] == seqs[ROW][col] for s in others) / len(others) for col in cols
]

NAMES = {
    '1': 'alpha1beta1 interface',
    '2': 'alpha1beta2 interface',
    'B': 'buried, no interface',
    'E': 'exposed, no interface',
}
for code, label in NAMES.items():
    vals = [v for v, c in zip(identity, classes) if c == code]
    invariant = sum(v == 1 for v in vals)
    print(f'{label:24s} {len(vals):3d} residues, mean identity {sum(vals) / len(vals):.2f}, {invariant} identical in all 11 rows')

arcs = next(t for t in layers['columnTracks'] if t['kind'] == 'arc')['arcs']
kept = sum(identity[a['start'] - 1] == 1 and identity[a['end'] - 1] == 1 for a in arcs)
print(f'{kept} of {len(arcs)} contact pairs have both residues identical in all 11 rows')

# 7. check it against the raw data: the letters every row carries at one
#    contact pair per interface. The alpha1beta2 pair is Tyr42 of alpha and
#    Asp99 of beta, the hydrogen bond that holds the deoxy tetramer, and the
#    alpha1beta1 pair is the one whose two residues vary the most.
ALPHA_START, BETA_START = 1, 143
by_color = {}
for a in arcs:
    by_color.setdefault(a['color'], []).append(a)
alpha1beta1, alpha1beta2 = by_color.values()
pairs = {
    'alpha1beta2 Tyr42-Asp99': next(
        a for a in alpha1beta2 if a['start'] == ALPHA_START + 42 and a['end'] == BETA_START + 99
    ),
    'alpha1beta1, most variable': min(
        alpha1beta1, key=lambda a: identity[a['start'] - 1] + identity[a['end'] - 1]
    ),
}
for label, arc in pairs.items():
    start, end = arc['start'], arc['end']
    print(f'{label}: row residues {start} and {end}, columns {cols[start - 1] + 1} and {cols[end - 1] + 1}')
    for name, s in seqs.items():
        print(f'  {name:10s} {s[cols[start - 1]]} {s[cols[end - 1]]}')
PY

echo
echo "wrote $OUT/hemoglobin.afa, $OUT/hemoglobin.nwk, $OUT/hemoglobin-subunits.gff, $OUT/hemoglobin-layers.json"
