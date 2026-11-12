# /// script
# requires-python = ">=3.10"
# dependencies = ["torch==2.15.0", "fair-esm==2.0.0"]
#
# [tool.uv.sources]
# torch = { index = "pytorch-cpu" }
#
# [[tool.uv.index]]
# name = "pytorch-cpu"
# url = "https://download.pytorch.org/whl/cpu"
# explicit = true
# ///
"""ESM-2 contact predictions for human Src, scored against PDB 2SRC.

Steps:
  - ESM-2 (esm2_t33_650M_UR50D) reads the SRC_HUMAN row of the kinase
    alignment, ungapped, and its contact head gives a probability for every
    residue pair. The model sees the one sequence, with no alignment and no
    structure.
  - contactMap.mjs lists the residues 2SRC resolves and every pair of them
    whose C-beta atoms sit under 8 A, in UniProt numbering, which is the
    row's numbering too.
  - Pairs at least 6 residues apart with both ends resolved are ranked by
    probability, and the top L are kept as arcs, where L is the number of
    resolved residues. For Src the top L reaches down to a probability of
    0.48. The script counts how many of the top L/5, L/2 and L are 2SRC
    contacts, the precision figures CASP reports, and the same for the top
    L/5 of pairs at least 24 apart.

Writes packages/examples/src/examples/kinaseEsmContacts.json.

    uv run scripts/examples-gen/kinaseEsmContacts.py

The first run downloads torch (CPU) and the 2.5 GB ESM-2 weights into
~/.cache. The contact map takes one forward pass, about 4 seconds on eight
CPU threads.
"""

import json
import re
import subprocess
import sys
import time
from pathlib import Path

import esm
import torch

here = Path(__file__).resolve().parent
alignment = here / "../../packages/examples/data/kinase.aln"
contact_file = here / "build/2src-contacts.json"
out_file = here / "../../packages/examples/src/examples/kinaseEsmContacts.json"

ROW = "SRC_HUMAN"
ACCESSION = "P12931"
PDB = "2src"
CHAIN = "A"
CUTOFF = 8
MIN_SEPARATION = 6
LONG_RANGE = 24
MODEL = "esm2_t33_650M_UR50D"


def row_sequence():
    block = re.search(rf"^>{ROW}\n([^>]+)", alignment.read_text(), re.M)
    if not block:
        sys.exit(f"{alignment} has no row {ROW}")
    return re.sub(r"[\s.-]", "", block[1])


def structure_contacts():
    contact_file.parent.mkdir(exist_ok=True)
    subprocess.run(
        [
            "node",
            str(here / "contactMap.mjs"),
            PDB,
            CHAIN,
            ACCESSION,
            alignment.name,
            ROW,
            str(CUTOFF),
            str(contact_file),
        ],
        check=True,
    )
    return json.loads(contact_file.read_text())


def esm_contacts(sequence):
    torch.set_num_threads(8)
    model, alphabet = esm.pretrained.load_model_and_alphabet(MODEL)
    model.eval()
    _, _, tokens = alphabet.get_batch_converter()([(ROW, sequence)])
    started = time.time()
    with torch.no_grad():
        contacts = model(tokens, return_contacts=True)["contacts"][0]
    print(f"ESM-2 contact map: {time.time() - started:.0f} s", file=sys.stderr)
    return contacts


def top_hits(ranked, real, n):
    return {"top": n, "contacts": sum(1 for pair in ranked[:n] if pair in real)}


sequence = row_sequence()
structure = structure_contacts()
resolved = structure["observed"]
real = {
    (start, end)
    for start, end in structure["contacts"]
    if end - start >= MIN_SEPARATION
}
probabilities = esm_contacts(sequence)


def probability(pair):
    return probabilities[pair[0] - 1, pair[1] - 1].item()


ranked = sorted(
    ((i, j) for i in resolved for j in resolved if j - i >= MIN_SEPARATION),
    key=lambda pair: -probability(pair),
)
long_range = [(i, j) for i, j in ranked if j - i >= LONG_RANGE]
L = len(resolved)
top = ranked[:L]
kept = set(top)

result = {
    "generatedBy": "scripts/examples-gen/kinaseEsmContacts.py",
    "row": ROW,
    "model": f"fair-esm {MODEL}, contact head (return_contacts=True)",
    "structure": {
        "pdb": structure["pdb"],
        "chain": CHAIN,
        "accession": ACCESSION,
        "cutoffAngstroms": CUTOFF,
    },
    "minSeparation": MIN_SEPARATION,
    "resolved": L,
    "realContacts": len(real),
    "precision": {
        "L/5": top_hits(ranked, real, L // 5),
        "L/2": top_hits(ranked, real, L // 2),
        "L": top_hits(ranked, real, L),
        "longRangeL/5": top_hits(long_range, real, L // 5),
    },
    "lowestKeptProbability": round(probability(top[-1]), 2),
    "predicted": [[i, j, round(probability((i, j)), 2)] for i, j in reversed(top)],
    "found": sorted([i, j] for i, j in real if (i, j) in kept),
    "missed": sorted([i, j] for i, j in real if (i, j) not in kept),
}
out_file.write_text(json.dumps(result, indent=2) + "\n")
print(
    json.dumps(
        {
            k: result[k]
            for k in ("resolved", "realContacts", "precision", "lowestKeptProbability")
        },
        indent=2,
    )
)
