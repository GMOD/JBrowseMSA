#!/usr/bin/env python3
"""Stitch a window of a UCSC bigMaf into a gapped FASTA alignment for a curated
species subset. Each bigBed feature is one MAF block (rows of equal length);
we concatenate blocks in reference order, gap-filling species absent from a
block, so the result is a valid column-aligned MSA."""
import subprocess, sys, collections

BIGMAF = "http://hgdownload.soe.ucsc.edu/goldenPath/hg38/cactus241way/cactus241way.bigMaf"
CHROM, START, END = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
OUT = sys.argv[4]

# id -> display label (ref first). ids match the bigMaf 'src' species token.
SPECIES = [
    ("hg38", "human"),
    ("Hippopotamus_amphibius", "hippo"),
    ("Balaenoptera_acutorostrata", "minke_whale"),
    ("Tursiops_truncatus", "dolphin"),
    ("Delphinapterus_leucas", "beluga"),
    ("Neophocaena_asiaeorientalis", "porpoise"),
    ("Trichechus_manatus", "manatee"),
    ("Enhydra_lutris", "sea_otter"),
    ("Leptonychotes_weddellii", "Weddell_seal"),
    ("Bos_taurus", "cow"),
    ("Sus_scrofa", "pig"),
    ("Vicugna_pacos", "alpaca"),
    ("Camelus_dromedarius", "camel"),
    ("Equus_caballus", "horse"),
    ("Canis_lupus_familiaris", "dog"),
    ("Loxodonta_africana", "elephant"),
    ("Mus_musculus", "mouse"),
]
ids = [s[0] for s in SPECIES]
label = dict(SPECIES)

raw = subprocess.run(
    ["bigBedToBed", BIGMAF, "stdout", f"-chrom={CHROM}", f"-start={START}", f"-end={END}"],
    capture_output=True, text=True, check=True,
).stdout

blocks = []  # (ref_start, {species_id: seq})
for line in raw.splitlines():
    parts = line.split("\t")
    if len(parts) < 4:
        continue
    rest = parts[3]
    rows = {}
    ref_start = None
    block_len = None
    for tok in rest.split(";"):
        tok = tok.strip()
        if not tok.startswith("s "):
            continue
        f = tok.split()
        if len(f) < 6:
            continue
        src, st, size, strand, srcsize, seq = f[1], f[2], f[3], f[4], f[5], f[6]
        sp = src.split(".")[0]
        rows[sp] = seq
        if sp == "hg38":
            ref_start = int(st)
        block_len = len(seq)
    if "hg38" in rows and block_len:
        blocks.append((ref_start, rows, block_len))

blocks.sort(key=lambda b: b[0])
cat = collections.OrderedDict((i, []) for i in ids)
for ref_start, rows, block_len in blocks:
    for i in ids:
        cat[i].append(rows.get(i, "-" * block_len))

seqs = {i: "".join(cat[i]) for i in ids}
lens = {len(v) for v in seqs.values()}
print(f"blocks={len(blocks)} aln_len={lens} species_with_data="
      f"{sum(1 for v in seqs.values() if set(v) - set('-'))}/{len(ids)}", file=sys.stderr)

with open(OUT, "w") as fh:
    for i in ids:
        s = seqs[i].upper()
        # drop a row that is entirely gaps/N (no alignment in this window)
        if set(s) - set("-N"):
            fh.write(f">{label[i]}\n{s}\n")
print("wrote", OUT, file=sys.stderr)
