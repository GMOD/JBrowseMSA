#!/usr/bin/env bash
# Build a kinase-domain alignment, tree and row metadata for the whole human
# kinome, and print the gatekeeper-residue count that closes
# docs/tutorials/kinase_pocket.md. Every step is the one shown there.
#
#   bash build_kinase_pocket.sh [outdir]
#
# Needs: curl, python3, docker (pulls quay.io/biocontainers/hmmer and
# quay.io/biocontainers/fasttree). Writes into outdir (default: .).
set -euo pipefail

OUT=${1:-.}
mkdir -p "$OUT"
HMMER_IMAGE=quay.io/biocontainers/hmmer:3.4--h7d74f8d_5
FASTTREE_IMAGE=quay.io/biocontainers/fasttree:2.2.0--h7b50bb2_1

# 1. UniProt's own classification of the human and mouse kinomes
curl -sfL https://www.uniprot.org/docs/pkinfam.txt -o "$OUT/pkinfam.txt"

# 2. keep the HUMAN entries and their group, dropping the paired MOUSE column
python3 - "$OUT" <<'EOF'
import json
import re
import sys

out = sys.argv[1]
lines = open(f'{out}/pkinfam.txt').read().splitlines()
group = None
rows = []
i, n = 0, len(lines)
while i < n:
    line = lines[i]
    if re.fullmatch(r'=+', line.strip()) and i + 2 < n and re.fullmatch(r'=+', lines[i + 2].strip()):
        group = lines[i + 1].strip()
        i += 3
        continue
    m = re.match(r'^(\S+)\s+(\S+_HUMAN)\s+\((\w+)\s*\)', line)
    if m:
        gene, entry, acc = m.groups()
        short = group.split()[0].rstrip(':')
        if group.startswith('Tyr'):
            short = 'TK'
        elif group.startswith('Atypical'):
            short = 'Atypical'
        rows.append({'gene': gene, 'accession': acc, 'group': short})
    i += 1
json.dump(rows, open(f'{out}/kinases.json', 'w'), indent=1)
print(f'{len(rows)} human kinase entries')
EOF

# 3. one UniProt sequence per accession, 50 per request through the /stream
#    endpoint rather than one request per protein
python3 - "$OUT" <<'EOF'
import json
import sys
import time
import urllib.parse
import urllib.request

out = sys.argv[1]
kinases = json.load(open(f'{out}/kinases.json'))
accs = [k['accession'] for k in kinases]
batch = 50
with open(f'{out}/all.fasta', 'w') as fh:
    for i in range(0, len(accs), batch):
        chunk = accs[i:i + batch]
        query = ' OR '.join(f'accession:{a}' for a in chunk)
        url = 'https://rest.uniprot.org/uniprotkb/stream?query=' + urllib.parse.quote(query) + '&format=fasta'
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url, timeout=60) as resp:
                    fh.write(resp.read().decode())
                break
            except Exception:
                time.sleep(2)
        else:
            raise SystemExit(f'failed to fetch batch at {i}')
print('fetched', len(accs), 'sequences')
EOF

# 4. the Pfam Pkinase HMM (PF00069), gzip-compressed over HTTP
curl -sf "https://www.ebi.ac.uk/interpro/api/entry/pfam/PF00069/?annotation=hmm" |
  gzip -dc > "$OUT/pf00069.hmm"

# 5. score every candidate against the HMM; keep only entries that clear
#    Pfam's own gathering threshold, which is how the atypical, non-ePK-fold
#    kinases (PI3/PI4-kinase, ADCK, alpha-type...) drop out
docker run --rm -v "$OUT:/work" -w /work "$HMMER_IMAGE" \
  hmmsearch --cut_ga --tblout hmmsearch.tbl -o hmmsearch.out pf00069.hmm all.fasta

python3 - "$OUT" <<'EOF'
import json
import sys

out = sys.argv[1]
passing = set()
for line in open(f'{out}/hmmsearch.tbl'):
    if line.startswith('#'):
        continue
    passing.add(line.split('|')[1])

kinases = json.load(open(f'{out}/kinases.json'))
seqs, name, buf = {}, None, []
for line in open(f'{out}/all.fasta'):
    line = line.rstrip('\n')
    if line.startswith('>'):
        if name is not None:
            seqs[name] = ''.join(buf)
        name, buf = line.split('|')[1], []
    else:
        buf.append(line)
if name is not None:
    seqs[name] = ''.join(buf)

kept = [k for k in kinases if k['accession'] in passing]
json.dump(kept, open(f'{out}/kept.json', 'w'), indent=1)
with open(f'{out}/kept.fasta', 'w') as fh:
    for k in kept:
        fh.write(f">{k['gene']}\n{seqs[k['accession']]}\n")
print(f'{len(kept)} of {len(kinases)} entries clear the Pkinase gathering threshold')
EOF

# 6. align the kinase domain to the HMM and keep only its match columns
#    (--trim drops unaligned terminal tails; stripping the lowercase/'.'
#    insert-state characters that remain collapses the alignment to a fixed
#    262 columns, the HMM's own length)
docker run --rm -v "$OUT:/work" -w /work "$HMMER_IMAGE" \
  hmmalign --trim --outformat afa -o kinase.afa pf00069.hmm kept.fasta

python3 - "$OUT" <<'EOF'
import sys

out = sys.argv[1]
seqs, name, buf = {}, None, []
for line in open(f'{out}/kinase.afa'):
    line = line.rstrip('\n')
    if line.startswith('>'):
        if name is not None:
            seqs[name] = ''.join(buf)
        name, buf = line[1:].strip(), []
    else:
        buf.append(line)
if name is not None:
    seqs[name] = ''.join(buf)

lengths = set()
with open(f'{out}/kinase-pocket.afa', 'w') as fh:
    for name, seq in seqs.items():
        kept = ''.join(c for c in seq if c.isupper() or c == '-')
        lengths.add(len(kept))
        fh.write(f'>{name}\n{kept}\n')
print('alignment width after trimming inserts:', lengths)
EOF

# 7. FastTree from the trimmed alignment -- a real phylogeny, not the
#    viewer's built-in neighbor joining (capped at 500 rows; see the page)
docker run --rm -v "$OUT:/work" -w /work "$FASTTREE_IMAGE" \
  FastTree kinase-pocket.afa > "$OUT/kinase-pocket.nwk" 2> "$OUT/fasttree.log"
tail -1 "$OUT/fasttree.log"

# 8. row metadata: each gene's kinase group and accession, read by the
#    viewer's node-info dialog on click
python3 - "$OUT" <<'EOF'
import json
import sys

out = sys.argv[1]
kept = json.load(open(f'{out}/kept.json'))
meta = {k['gene']: {'group': k['group'], 'uniprot': k['accession']} for k in kept}
json.dump(meta, open(f'{out}/kinase-pocket-metadata.json', 'w'), indent=1)
EOF

echo
echo "wrote $OUT/kinase-pocket.afa, $OUT/kinase-pocket.nwk, $OUT/kinase-pocket-metadata.json"
