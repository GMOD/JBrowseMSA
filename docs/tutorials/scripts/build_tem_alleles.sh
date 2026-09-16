#!/usr/bin/env bash
# Build the TEM beta-lactamase alignment of docs/tutorials/tem_alleles.md: named
# TEM alleles from NCBI's Reference Gene Catalog with the phenotype class the
# catalog records, aligned, tree-inferred, and written out as a row table of the
# residue each allele carries at the Ambler positions behind extended-spectrum
# and inhibitor-resistant phenotypes. Every step is the one the page shows.
#
#   bash build_tem_alleles.sh [outdir]
#
# Needs: curl, clustalw and python3 (standard library only). Writes into outdir
# (default: .) and prints every number the page quotes.
set -euo pipefail

OUT=${1:-.}
mkdir -p "$OUT"

DB=https://ftp.ncbi.nlm.nih.gov/pathogen/Antimicrobial_resistance/AMRFinderPlus/database/latest

# 1. the catalog and the reference proteins AMRFinderPlus ships. The catalog
#    names every allele and its phenotype, AMRProt.fa carries the sequences
curl -sfLo "$OUT/ReferenceGeneCatalog.txt" "$DB/ReferenceGeneCatalog.txt"
curl -sfLo "$OUT/AMRProt.fa" "$DB/AMRProt.fa"

# 2. pick the alleles: every blaTEM-<number> whose product name carries one of
#    the four phenotypes the catalog spells out, the twelve lowest-numbered per
#    phenotype, and write their sequences with the allele name as the defline
python3 - "$OUT" <<'PY'
import collections
import re
import sys

out = sys.argv[1]
PHENOTYPES = [
    'broad-spectrum',
    'extended-spectrum',
    'inhibitor-resistant broad-spectrum',
    'inhibitor-resistant extended-spectrum',
]
PER_PHENOTYPE = 12

lines = [l.rstrip('\n').split('\t') for l in open(f'{out}/ReferenceGeneCatalog.txt')]
header = lines[0]
catalog = [dict(zip(header, row)) for row in lines[1:]]

seqs, acc = {}, None
for line in open(f'{out}/AMRProt.fa'):
    if line.startswith('>'):
        acc = line[1:].split('|')[0]
        seqs[acc] = ''
    elif acc:
        seqs[acc] += line.strip().rstrip('*')

candidates = collections.defaultdict(list)
for row in catalog:
    if row['gene_family'] != 'blaTEM':
        continue
    number = re.fullmatch(r'blaTEM-(\d+)', row['allele'])
    phenotype = row['product_name'].split(' class A')[0]
    if not number or phenotype not in PHENOTYPES:
        continue
    candidates[phenotype].append((int(number.group(1)), row))

selected = []
for phenotype in PHENOTYPES:
    picked = sorted(candidates[phenotype], key=lambda pair: pair[0])[:PER_PHENOTYPE]
    print(f'{phenotype}: {len(candidates[phenotype])} alleles in the catalog, {len(picked)} kept')
    for number, row in picked:
        selected.append((f'TEM-{number}', phenotype, row))

with open(f'{out}/tem-alleles.tsv', 'w') as tsv, open(f'{out}/tem.fasta', 'w') as fasta:
    tsv.write('allele\tphenotype\tsubclass\tprotein_accession\tlength\n')
    for name, phenotype, row in selected:
        accession = row['refseq_protein_accession']
        seq = seqs[accession]
        tsv.write(f'{name}\t{phenotype}\t{row["subclass"]}\t{accession}\t{len(seq)}\n')
        fasta.write(f'>{name}\n{seq}\n')

lengths = collections.Counter(len(seqs[row['refseq_protein_accession']]) for _, _, row in selected)
print(f'{len(selected)} alleles selected, lengths ' + ', '.join(f'{k} aa x {v}' for k, v in sorted(lengths.items())))
PY

# 3. align. The alleles are point mutants of one another, so the alignment is a
#    column per residue except where one allele is shorter
clustalw -INFILE="$OUT/tem.fasta" -ALIGN -TYPE=PROTEIN -OUTORDER=INPUT \
  -OUTPUT=FASTA -OUTFILE="$OUT/tem.afa" > /dev/null

# 4. neighbor-joining tree from the alignment. ClustalW wraps the Newick across
#    lines, so strip the whitespace to leave one string
clustalw -INFILE="$OUT/tem.afa" -TREE -TYPE=PROTEIN -OUTPUTTREE=phylip > /dev/null
tr -d '[:space:]' < "$OUT/tem.ph" > "$OUT/tem.nwk"
rm -f "$OUT/tem.ph"

# 5. the row table: the phenotype the catalog records, plus the residue each
#    allele carries at the Ambler positions behind the two phenotypes. Ambler
#    numbering runs from 3 to 290 over a 286-residue protein and skips 239 and
#    253, so every position is mapped through the TEM-1 row and checked against
#    the residues the literature names before anything downstream uses it.
python3 - "$OUT" <<'PY'
import collections
import json
import math
import os
import sys

out = sys.argv[1]
REFERENCE = 'TEM-1'
ESBL = [104, 164, 238, 240]
INHIBITOR = [69, 244, 276]
# Ambler position -> the residue TEM-1 carries there, as the reviews name it
TEM1_RESIDUES = {
    69: 'M', 70: 'S', 73: 'K', 104: 'E', 130: 'S', 164: 'R', 166: 'E',
    234: 'K', 238: 'G', 240: 'E', 244: 'R', 276: 'N',
}
MIN_MINOR_ROWS = 3

aligned, name = {}, None
for line in open(f'{out}/tem.afa'):
    if line.startswith('>'):
        name = line[1:].strip()
        aligned[name] = ''
    elif name:
        aligned[name] += line.strip()

phenotype, subclass = {}, {}
for line in list(open(f'{out}/tem-alleles.tsv'))[1:]:
    allele, phen, sub = line.rstrip('\n').split('\t')[:3]
    phenotype[allele] = phen
    subclass[allele] = sub

rows = list(aligned)
columns = len(aligned[REFERENCE])
reference = aligned[REFERENCE]
print(f'{len(rows)} rows, {columns} alignment columns')


def ambler(index):
    """Ambler number of 1-based residue `index` of the TEM-1 sequence."""
    position = index + 2
    if position >= 239:
        position += 1
    if position >= 253:
        position += 1
    return position


# 1-based residue of the reference -> 0-based alignment column
column_of_residue = [i for i, char in enumerate(reference) if char != '-']
ambler_column = {ambler(i + 1): c for i, c in enumerate(column_of_residue)}

found = {p: reference[ambler_column[p]] for p in sorted(TEM1_RESIDUES)}
print(f'{REFERENCE} residues at the named Ambler positions: ' + ' '.join(f'{p}{r}' for p, r in found.items()))
wrong = {p: r for p, r in found.items() if r != TEM1_RESIDUES[p]}
if wrong:
    raise SystemExit(f'Ambler mapping is off: {wrong}')
print(f'the mapping is Ambler = residue index + 2 up to 238, + 3 from 240 to 252, + 4 from 254')
print(f'Ambler {ESBL + INHIBITOR} are columns ' + ', '.join(str(ambler_column[p] + 1) for p in ESBL + INHIBITOR))


def cramers_v(pairs):
    table = collections.Counter(pairs)
    total = sum(table.values())
    residues = sorted({a for a, _ in table})
    classes = sorted({b for _, b in table})
    chi2 = 0.0
    for a in residues:
        row_total = sum(table[(a, b)] for b in classes)
        for b in classes:
            column_total = sum(table[(x, b)] for x in residues)
            expected = row_total * column_total / total
            chi2 += (table[(a, b)] - expected) ** 2 / expected
    degrees = min(len(residues), len(classes)) - 1
    return math.sqrt(chi2 / (total * degrees)) if degrees else 0.0


# every variable position, how its residues split across the four phenotypes
variable = []
for position, column in ambler_column.items():
    letters = collections.Counter(aligned[row][column] for row in rows)
    if len(letters) < 2:
        continue
    minor = sum(letters.values()) - max(letters.values())
    v = cramers_v([(aligned[row][column], phenotype[row]) for row in rows])
    variable.append((position, letters, minor, v))

print(f'{len(variable)} of the {len(column_of_residue)} positions vary across the {len(rows)} alleles')
print("position  residues                  Cramer's V  split by phenotype")
for position, letters, minor, v in sorted(variable, key=lambda item: -item[3]):
    column = ambler_column[position]
    split = collections.Counter(
        (aligned[row][column], phenotype[row]) for row in rows
    )
    by_letter = []
    for letter in sorted(letters, key=lambda x: -letters[x]):
        counts = ' '.join(
            f'{phen.replace("inhibitor-resistant", "IR")} {split[(letter, phen)]}'
            for phen in sorted({p for l, p in split if l == letter})
        )
        by_letter.append(f'{letter}={letters[letter]} [{counts}]')
    spelled = ','.join(f'{letters[l]}{l}' for l in sorted(letters, key=lambda x: -letters[x]))
    print(f'{position:8d}  {spelled:24s}  {v:10.2f}  ' + '; '.join(by_letter))

# the control: the variable position least associated with phenotype, among
# those whose minor residues are carried by at least MIN_MINOR_ROWS alleles, so
# the column has something to read
control = min(
    (item for item in variable if item[2] >= MIN_MINOR_ROWS),
    key=lambda item: item[3],
)
control_position = control[0]
print(f'control position: Ambler {control_position}, {reference[ambler_column[control_position]]} in {REFERENCE}, '
      f"minor residues in {control[2]} alleles, Cramer's V {control[3]:.2f}")

fields = ESBL + INHIBITOR + [control_position]
table = {}
for row in rows:
    record = {'phenotype': phenotype[row], 'subclass': subclass[row]}
    for position in fields:
        record[f'Ambler {position}'] = aligned[row][ambler_column[position]]
    table[row] = record

path = f'{out}/tem-rowdata.json'
with open(path, 'w') as fh:
    json.dump(table, fh, indent=1)
print(f'wrote {path}: {len(table)} rows, {len(fields) + 2} fields, {os.path.getsize(path) // 1024} kB')

for position in fields:
    column = ambler_column[position]
    counts = collections.Counter(aligned[row][column] for row in rows)
    print(f'  Ambler {position}: ' + ', '.join(f'{letter} {n}' for letter, n in counts.most_common()))

# how many alleles of each phenotype carry a substitution at the four ESBL
# positions and at the three inhibitor-resistance positions
for label, positions in (('ESBL positions 104/164/238/240', ESBL),
                         ('inhibitor positions 69/244/276', INHIBITOR)):
    counts = collections.Counter()
    for row in rows:
        substituted = sum(
            aligned[row][ambler_column[p]] != reference[ambler_column[p]] for p in positions
        )
        counts[phenotype[row]] += substituted > 0
    totals = collections.Counter(phenotype[row] for row in rows)
    print(f'{label}: ' + ', '.join(
        f'{phen} {counts[phen]}/{totals[phen]}' for phen in sorted(totals)
    ))

# 6. the tree: the largest clade whose alleles all share one phenotype, per
#    phenotype, off the Newick the aligner wrote
newick = open(f'{out}/tem.nwk').read().strip().rstrip(';')


def clades(text):
    """Every internal node of a Newick string, as a list of tip names."""
    stack, found = [[]], []
    token = ''
    for char in text:
        if char == '(':
            stack.append([])
        elif char in ',)':
            leaf = token.split(':')[0].strip()
            if leaf:
                stack[-1].append(leaf)
            token = ''
            if char == ')':
                node = stack.pop()
                found.append(node)
                stack[-1].extend(node)
        else:
            token += char
    return found


nodes = clades(newick)
agree = sum(1 for c in nodes if len({phenotype[t] for t in c}) == 1)
print(f'{agree} of the {len(nodes)} internal nodes hold alleles of one phenotype')
for phen in sorted(set(phenotype.values())):
    pure = [c for c in nodes if all(phenotype[t] == phen for t in c)]
    total = sum(1 for row in rows if phenotype[row] == phen)
    largest = max((len(c) for c in pure), default=0)
    print(f'largest clade holding {phen} alleles only: {largest} of {total}')

# 7. the check: the letters a few named alleles carry at every field position,
#    taken out of the unaligned NCBI sequences by the Ambler arithmetic alone,
#    and compared with the row table the viewer loads
CHECKS = ['TEM-1', 'TEM-2', 'TEM-3', 'TEM-10', 'TEM-12', 'TEM-30', 'TEM-32', 'TEM-125']
unaligned, name = {}, None
for line in open(f'{out}/tem.fasta'):
    if line.startswith('>'):
        name = line[1:].strip()
        unaligned[name] = ''
    elif name:
        unaligned[name] += line.strip()

reference_length = len(reference.replace('-', ''))
residue_of_ambler = {ambler(i + 1): i for i in range(reference_length)}
print('allele    ' + ' '.join(f'{p:>4d}' for p in fields) + '  phenotype')
for row in CHECKS:
    # the arithmetic indexes the sequence itself, which lands on the Ambler
    # residue only in an allele of the reference's length
    if len(unaligned[row]) != reference_length:
        raise SystemExit(f'{row} is {len(unaligned[row])} residues, not {reference_length}')
    letters = [unaligned[row][residue_of_ambler[p]] for p in fields]
    from_table = [table[row][f'Ambler {p}'] for p in fields]
    if letters != from_table:
        raise SystemExit(f'{row}: the FASTA reads {letters}, the row table {from_table}')
    print(f'{row:9s} ' + ' '.join(f'{l:>4s}' for l in letters) + f'  {phenotype[row]}')
PY

# 7. the hosted files: the alignment, the tree and the row table
ls -l "$OUT/tem.afa" "$OUT/tem.nwk" "$OUT/tem-rowdata.json" "$OUT/tem-alleles.tsv"
