#!/usr/bin/env bash
# Build a whole-genome RSV-A alignment and tree from a Nextstrain build: fetch
# the auspice JSON, reconstruct every tip's genome by applying the mutations
# on its path from the root to the embedded reference, and write a full-scale
# dataset (every tip) plus a subsampled one (every 10th tip) for the figures in
# docs/tutorials/phylogeny_at_scale.md.
#
#   bash build_phylogeny_at_scale.sh [outdir]
#
# Needs: curl, python3 (standard library only)
set -euo pipefail

OUT=${1:-.}
mkdir -p "$OUT"

URL=https://data.nextstrain.org/rsv_a_genome.json
echo "fetching $URL"
curl -sf --compressed -o "$OUT/rsv_a_genome.json" "$URL"

python3 - "$OUT" <<'PYEOF'
import json
import re
import sys
import collections

out = sys.argv[1]
d = json.load(open(f"{out}/rsv_a_genome.json"))
meta = d["meta"]
tree = d["tree"]
root_seq = d["root_sequence"]["nuc"]
genome_len = len(root_seq)

ann = meta["genome_annotations"]
G_START, G_END = ann["G"]["start"], ann["G"]["end"]
L_START, L_END = ann["L"]["start"], ann["L"]["end"]

MUT_RE = re.compile(r"^([A-Za-z-])(\d+)([A-Za-z-])$")


def label_for(node_attrs, name):
    accession = re.sub(r"\s+", "_", name)
    clade = node_attrs.get("clade_membership", {}).get("value", "NA")
    country = node_attrs.get("country", {}).get("value", "NA").replace(" ", "_")
    num_date = node_attrs.get("num_date", {}).get("value")
    year = str(int(num_date)) if num_date is not None else "NA"
    return f"{accession}|{clade}|{country}|{year}"


# 1. reconstruct every tip's full-genome sequence: copy the root sequence down
# each root-to-tip path, overwriting one base per mutation on that branch.
# Nextstrain numbers every mutation against this same reference, so positions
# never drift and the result is already an alignment -- every row the same
# length, gaps and all.
tips = []  # (label, seq_bytes, div)


def reconstruct(node, seq):
    muts = node.get("branch_attrs", {}).get("mutations", {}).get("nuc", [])
    if muts:
        seq = bytearray(seq)
        for m in muts:
            mm = MUT_RE.match(m)
            if mm:
                _, pos, alt = mm.groups()
                seq[int(pos) - 1] = ord(alt)
        seq = bytes(seq)
    kids = node.get("children")
    na = node.get("node_attrs", {})
    if not kids:
        tips.append((label_for(na, node["name"]), seq, na.get("div", 0)))
    else:
        for k in kids:
            reconstruct(k, seq)


reconstruct(tree, root_seq.encode())
print(f"reconstructed {len(tips)} tip sequences, genome length {genome_len}")
print(f"G gene {G_START}-{G_END} ({G_END - G_START + 1} nt)")
print(f"L gene {L_START}-{L_END} ({L_END - L_START + 1} nt)")

# 2. full-scale dataset: every tip, sliced to the G gene so the file this
# writes stays a few MB instead of the ~28 MB the whole genome would be at
# this row count.
G0, G1 = G_START - 1, G_END
with open(f"{out}/rsv-full.aln", "w") as fh:
    for label, seq, _div in tips:
        fh.write(f">{label}\n{seq[G0:G1].decode()}\n")


def write_newick(node, out_parts, parent_div, label_of):
    kids = node.get("children")
    na = node.get("node_attrs", {})
    div = na.get("div", 0)
    bl = max(div - parent_div, 0)
    if not kids:
        out_parts.append(f"{label_of(na, node['name'])}:{bl:.5f}")
    else:
        parts = []
        for k in kids:
            write_newick(k, parts, div, label_of)
        out_parts.append(f"({','.join(parts)}):{bl:.5f}")


parts = []
write_newick(tree, parts, 0, label_for)
with open(f"{out}/rsv-full.nh", "w") as fh:
    fh.write(parts[0] + ";\n")
print(f"wrote {out}/rsv-full.aln and {out}/rsv-full.nh ({len(tips)} tips)")

# 3. find a clade to collapse: every descendant tip shares one clade call and
# one country, so the triangle in the figure is a real epidemiological unit,
# not an arbitrary cut. generateNodeIds (msa-parsers/src/util.ts) assigns
# 'node-<parent>-<childIndex>-<depth>' in the same child order the Newick
# above preserves, so this id is what the viewer will compute too.
node_tips = {}


def index_ids(node, this_id, depth):
    kids = node.get("children")
    na = node.get("node_attrs", {})
    if not kids:
        clade = na.get("clade_membership", {}).get("value", "NA")
        country = na.get("country", {}).get("value", "NA")
        node_tips[this_id] = [(clade, country)]
        return node_tips[this_id]
    acc = []
    for i, k in enumerate(kids):
        acc += index_ids(k, f"{this_id}-{i}-{depth + 1}", depth + 1)
    node_tips[this_id] = acc
    return acc


index_ids(tree, "node-0", 0)
best = None
for nid, recs in node_tips.items():
    if not (20 <= len(recs) <= 60):
        continue
    clades = collections.Counter(r[0] for r in recs)
    countries = collections.Counter(r[1] for r in recs)
    tc, ct = clades.most_common(1)[0]
    tco, cc = countries.most_common(1)[0]
    if ct == len(recs) and cc == len(recs) and (
        best is None or len(recs) > best[1]
    ):
        best = (nid, len(recs), tc, tco)
print(f"collapse target: {best[0]}, {best[1]} tips, clade {best[2]}, all {best[3]}")

# 4. subsample: every 10th tip in the file's own order, deterministic and
# reproducible with no seed to explain. Pruning a tree only ever removes a
# node's children and, when that leaves exactly one, splices it out -- 'div' is
# already cumulative from the root, so the branch length above any surviving
# node is just its own div minus its nearest surviving ancestor's, with no
# rescaling needed.
STEP = 10
sample_labels = {label for i, (label, _, _) in enumerate(tips) if i % STEP == 0}
print(f"subsample: {len(sample_labels)} of {len(tips)} tips (every {STEP}th)")


def prune(node):
    kids = node.get("children")
    na = node.get("node_attrs", {})
    if not kids:
        label = label_for(na, node["name"])
        return {"label": label, "div": na.get("div", 0), "children": None} \
            if label in sample_labels else None
    new_kids = [c for c in (prune(k) for k in kids) if c is not None]
    if not new_kids:
        return None
    if len(new_kids) == 1:
        return new_kids[0]
    return {"label": None, "div": na.get("div", 0), "children": new_kids}


pruned = prune(tree)


def write_newick_pruned(node, out_parts, parent_div):
    div = node["div"]
    bl = max(div - parent_div, 0)
    if node["children"] is None:
        out_parts.append(f"{node['label']}:{bl:.5f}")
    else:
        parts = []
        for c in node["children"]:
            write_newick_pruned(c, parts, div)
        out_parts.append(f"({','.join(parts)}):{bl:.5f}")


parts = []
write_newick_pruned(pruned, parts, 0)
with open(f"{out}/rsv-sample.nh", "w") as fh:
    fh.write(parts[0] + ";\n")

with open(f"{out}/rsv-sample.aln", "w") as fh:
    for label, seq, _div in tips:
        if label in sample_labels:
            fh.write(f">{label}\n{seq.decode()}\n")
print(f"wrote {out}/rsv-sample.aln and {out}/rsv-sample.nh ({len(sample_labels)} tips, {genome_len} nt)")

sample_clades = collections.Counter(label.split("|")[1] for label in sample_labels)
all_clades = {label.split("|")[1] for label, _seq, _div in tips}
print(f"{len(sample_clades)} of {len(all_clades)} clades represented in the subsample")
for clade, n in sample_clades.most_common(6):
    print(f"  {clade}: {n}")

# 5. variable columns per gene, counted directly from the subsampled
# full-genome alignment -- the same file docs/tutorials/phylogeny_at_scale.md
# re-derives these numbers from at the end.
sample_seqs = [seq for label, seq, _ in tips if label in sample_labels]


def variable_columns(start1, end1):
    count = 0
    for col in range(start1 - 1, end1):
        alleles = {s[col] for s in sample_seqs}
        alleles.discard(ord("N"))
        if len(alleles) > 1:
            count += 1
    return count, end1 - start1 + 1


g_var, g_len = variable_columns(G_START, G_END)
l_var, l_len = variable_columns(L_START, L_END)
print(f"G gene: {g_var}/{g_len} variable columns ({100 * g_var / g_len:.1f}%)")
print(f"L gene: {l_var}/{l_len} variable columns ({100 * l_var / l_len:.1f}%)")

# the two 100nt windows the base-resolution figures scroll to: the most
# variable stretch of G and the most conserved stretch of L, both found by
# sliding a 100nt window across each gene and counting.
g_hot_var, _ = variable_columns(5442, 5541)
l_cold_var, _ = variable_columns(10132, 10231)
print(f"G hotspot (5442-5541): {g_hot_var}/100 variable columns")
print(f"L coldspot (10132-10231): {l_cold_var}/100 variable columns")
PYEOF

rm -f "$OUT/rsv_a_genome.json"
