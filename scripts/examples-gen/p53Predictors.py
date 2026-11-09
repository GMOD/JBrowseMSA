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
"""Two variant-effect predictors and a measured screen for the p53 example.

Steps:
  1. ESM-2 (esm2_t33_650M_UR50D), a protein language model trained on UniRef
     sequences with no variant labels, scores every substitution of the human
     row by masked marginals: mask the residue, and take log P(substitute)
     minus log P(wild type) at that position.
  2. AlphaMissense's table for P04637, read from the `amAnnotationsUrl` the
     AlphaFold API gives.
  3. The Giacomelli 2018 saturation screen (MaveDB urn:mavedb:00000068-a-1):
     A549 cells with a wild-type copy under nutlin-3, so a variant that
     enriches has disabled p53 with the wild-type protein present.
  4. Each source averaged per residue into a bar track, Spearman correlations
     of each model against the screen over the variants all three score, and
     the residues where the two models' per-residue ranks differ most.

Writes packages/examples/src/examples/p53Predictors.json.

    uv run scripts/examples-gen/p53Predictors.py

The first run downloads torch (CPU) and the 2.5 GB ESM-2 weights into
~/.cache. Scoring 393 positions takes a few minutes on eight CPU threads.
"""

import csv
import io
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

import esm
import torch

here = Path(__file__).resolve().parent
alignment = here / "../../packages/examples/data/p53.aln"
out_file = here / "../../packages/examples/src/examples/p53Predictors.json"

ROW = "Human"
ACCESSION = "P04637"
MAVEDB = "urn:mavedb:00000068-a-1"
MODEL = "esm2_t33_650M_UR50D"
AMINO_ACIDS = "ACDEFGHIKLMNPQRSTVWY"
UA = {"User-Agent": "react-msaview-examples (https://gmod.org/JBrowseMSA)"}
THREE = {
    "Ala": "A",
    "Arg": "R",
    "Asn": "N",
    "Asp": "D",
    "Cys": "C",
    "Gln": "Q",
    "Glu": "E",
    "Gly": "G",
    "His": "H",
    "Ile": "I",
    "Leu": "L",
    "Lys": "K",
    "Met": "M",
    "Phe": "F",
    "Pro": "P",
    "Ser": "S",
    "Thr": "T",
    "Trp": "W",
    "Tyr": "Y",
    "Val": "V",
}


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r:
        return r.read().decode()


def row_sequence():
    text = alignment.read_text()
    block = re.search(rf"^>{ROW}\n([^>]+)", text, re.M)
    if not block:
        sys.exit(f"{alignment} has no row {ROW}")
    return re.sub(r"[\s.-]", "", block[1])


def esm_scores(sequence):
    torch.set_num_threads(8)
    model, alphabet = esm.pretrained.load_model_and_alphabet(MODEL)
    model.eval()
    _, _, tokens = alphabet.get_batch_converter()([(ROW, sequence)])
    scores = {}
    batch = 16
    with torch.no_grad():
        for start in range(0, len(sequence), batch):
            positions = range(start, min(start + batch, len(sequence)))
            masked = tokens.repeat(len(positions), 1)
            for k, i in enumerate(positions):
                masked[k, i + 1] = alphabet.mask_idx
            logits = model(masked)["logits"]
            for k, i in enumerate(positions):
                logp = torch.log_softmax(logits[k, i + 1], dim=-1)
                wild = sequence[i]
                for aa in AMINO_ACIDS:
                    if aa != wild:
                        llr = logp[alphabet.get_idx(aa)] - logp[alphabet.get_idx(wild)]
                        scores[f"{wild}{i + 1}{aa}"] = -llr.item()
            print(f"ESM-2: {positions[-1] + 1} of {len(sequence)}", file=sys.stderr)
    return scores


def alphamissense():
    entry = json.loads(fetch(f"https://alphafold.ebi.ac.uk/api/prediction/{ACCESSION}"))
    table = csv.DictReader(io.StringIO(fetch(entry[0]["amAnnotationsUrl"])))
    return {r["protein_variant"]: float(r["am_pathogenicity"]) for r in table}


def screen():
    table = csv.DictReader(
        io.StringIO(fetch(f"https://api.mavedb.org/api/v1/score-sets/{MAVEDB}/scores"))
    )
    scores = {}
    for r in table:
        m = re.fullmatch(r"p\.([A-Z][a-z]{2})(\d+)([A-Z][a-z]{2})", r["hgvs_pro"])
        if m and m[1] in THREE and m[3] in THREE and r["score"] != "NA":
            scores[f"{THREE[m[1]]}{m[2]}{THREE[m[3]]}"] = float(r["score"])
    return scores


def ranks(values):
    order = sorted(range(len(values)), key=lambda i: values[i])
    result = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        for k in range(i, j + 1):
            result[order[k]] = (i + j) / 2
        i = j + 1
    return result


def spearman(a, b):
    ra, rb = ranks(a), ranks(b)
    n = len(ra)
    ma, mb = sum(ra) / n, sum(rb) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    var = sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb)
    return round(cov / var**0.5, 2)


def per_residue(scores, length):
    sums = [0.0] * length
    counts = [0] * length
    for variant, value in scores.items():
        i = int(variant[1:-1]) - 1
        sums[i] += value
        counts[i] += 1
    return [s / c if c else 0.0 for s, c in zip(sums, counts)]


sequence = row_sequence()
models = {"esm2": esm_scores(sequence), "alphamissense": alphamissense()}
measured = screen()
shared = sorted(set(models["esm2"]) & set(models["alphamissense"]) & set(measured))
for variant in shared:
    if variant[0] != sequence[int(variant[1:-1]) - 1]:
        sys.exit(f"{variant} does not match residue {variant[1:-1]} of {ROW}")

means = {name: per_residue(scores, len(sequence)) for name, scores in models.items()}
means["screen"] = per_residue(measured, len(sequence))
residue_means = {
    name: per_residue({v: scores[v] for v in shared}, len(sequence))
    for name, scores in {**models, "screen": measured}.items()
}
scored = [i for i in range(len(sequence)) if any(v[1:-1] == str(i + 1) for v in shared)]

percentile = {
    name: dict(
        zip(
            scored,
            (
                r / (len(scored) - 1)
                for r in ranks([residue_means[name][i] for i in scored])
            ),
        )
    )
    for name in models
}
gaps = sorted(
    scored, key=lambda i: -abs(percentile["esm2"][i] - percentile["alphamissense"][i])
)
disagreements = [
    {
        "residue": i + 1,
        "letter": sequence[i],
        "higher": "ESM-2"
        if percentile["esm2"][i] > percentile["alphamissense"][i]
        else "AlphaMissense",
        "esm2Percentile": round(100 * percentile["esm2"][i]),
        "alphamissensePercentile": round(100 * percentile["alphamissense"][i]),
    }
    for i in gaps[:6]
]

result = {
    "generatedBy": "scripts/examples-gen/p53Predictors.py",
    "retrieved": date.today().isoformat(),
    "row": ROW,
    "sources": {
        "esm2": f"fair-esm {MODEL}, masked marginals, -log P(substitute)/P(wild type)",
        "alphamissense": f"https://alphafold.ebi.ac.uk/api/prediction/{ACCESSION} amAnnotationsUrl",
        "screen": f"https://api.mavedb.org/api/v1/score-sets/{MAVEDB}/scores",
    },
    "variants": len(shared),
    "spearman": {
        "perVariant": {
            name: spearman([s[v] for v in shared], [measured[v] for v in shared])
            for name, s in models.items()
        },
        "perResidue": {
            name: spearman(
                [residue_means[name][i] for i in scored],
                [residue_means["screen"][i] for i in scored],
            )
            for name in models
        },
        "modelsPerVariant": spearman(
            [models["esm2"][v] for v in shared],
            [models["alphamissense"][v] for v in shared],
        ),
    },
    "means": {name: [round(v, 2) for v in values] for name, values in means.items()},
    "disagreements": disagreements,
}
out_file.write_text(json.dumps(result, indent=2) + "\n")
print(
    json.dumps(
        {k: result[k] for k in ("variants", "spearman", "disagreements")}, indent=2
    )
)
