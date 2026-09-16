#!/usr/bin/env python3
"""Build the row table for docs/tutorials/phylogeny_metadata.md.

Fetch Nextstrain's RSV-A build, read each tip's clade, country, region and year
out of its node_attrs, and write the 184-tip subsample as a JSON table keyed by
row name. Print every number the tutorial quotes: the size of the table, how
many tree edges a branch encoding of each field colors, the largest clade one
node covers with two tips that address it, the display rows where two clades
meet, and one tip's raw node_attrs beside the row it produced.

  python3 build_phylogeny_metadata.py [outdir]

Needs: python3, standard library only.

The labels, the every-10th subsample and the pruning below are the same code
build_phylogeny_at_scale.sh runs, so the keys of the table are the row names in
data/scale/rsv-sample.aln and the tree here is data/scale/rsv-sample.nh.
"""

import collections
import json
import os
import re
import sys
import urllib.request

URL = "https://data.nextstrain.org/rsv_a_genome.json"
STEP = 10
BL_PLACES = 5

out = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(out, exist_ok=True)
local = os.path.join(out, "rsv_a_genome.json")
if not os.path.exists(local):
    print(f"fetching {URL}")
    urllib.request.urlretrieve(URL, local)
with open(local) as fh:
    tree = json.load(fh)["tree"]


def label_for(node_attrs, name):
    accession = re.sub(r"\s+", "_", name)
    clade = node_attrs.get("clade_membership", {}).get("value", "NA")
    country = node_attrs.get("country", {}).get("value", "NA").replace(" ", "_")
    num_date = node_attrs.get("num_date", {}).get("value")
    year = str(int(num_date)) if num_date is not None else "NA"
    return f"{accession}|{clade}|{country}|{year}"


# 1. the fields the row table carries, one record per tip, read off the
# node_attrs Nextstrain publishes for that tip.
def fields_for(node_attrs):
    num_date = node_attrs.get("num_date", {}).get("value")
    return {
        "clade": node_attrs.get("clade_membership", {}).get("value", "NA"),
        "country": node_attrs.get("country", {}).get("value", "NA"),
        "region": node_attrs.get("region", {}).get("value", "NA"),
        "year": str(int(num_date)) if num_date is not None else "NA",
    }


tips = []


def walk(node):
    na = node.get("node_attrs", {})
    kids = node.get("children")
    if kids:
        for k in kids:
            walk(k)
    else:
        tips.append((label_for(na, node["name"]), fields_for(na), na))


walk(tree)
print(f"{len(tips)} tips in the build")

sample = [t for i, t in enumerate(tips) if i % STEP == 0]
sample_labels = {label for label, _fields, _na in sample}
table = {label: fields for label, fields, _na in sample}
path = os.path.join(out, "rsv-sample-rowdata.json")
with open(path, "w") as fh:
    json.dump(table, fh, indent=0, sort_keys=True)
    fh.write("\n")
print(f"wrote {path}: {len(table)} rows, {os.path.getsize(path) / 1024:.0f} kB")
for field in ("clade", "country", "region", "year"):
    values = {fields[field] for fields in table.values()}
    print(f"  {field}: {len(values)} distinct values")
for clade, n in collections.Counter(
    fields["clade"] for fields in table.values()
).most_common(5):
    print(f"  clade {clade}: {n} rows")


# 2. the pruned tree: every 10th tip kept, a node left with one surviving child
# spliced out, branch lengths rounded to the places the Newick file writes, so
# the child order below is the one the viewer reads.
def prune(node):
    na = node.get("node_attrs", {})
    div = na.get("div", 0)
    kids = node.get("children")
    if not kids:
        label = label_for(na, node["name"])
        if label not in sample_labels:
            return None
        return {"name": label, "div": div, "children": []}
    surviving = [c for c in (prune(k) for k in kids) if c is not None]
    if not surviving:
        return None
    if len(surviving) == 1:
        return surviving[0]
    return {"name": "", "div": div, "children": surviving}


def set_lengths(node, parent_div):
    node["length"] = float(f"{max(node['div'] - parent_div, 0):.{BL_PLACES}f}")
    for c in node["children"]:
        set_lengths(c, node["div"])


root = prune(tree)
set_lengths(root, 0)


def nodes_of(node):
    yield node
    for c in node["children"]:
        yield from nodes_of(c)


def leaves_of(node):
    if not node["children"]:
        yield node
    else:
        for c in node["children"]:
            yield from leaves_of(c)


all_nodes = list(nodes_of(root))
internal = [n for n in all_nodes if n["children"]]
print(f"pruned tree: {len(all_nodes) - len(internal)} tips, {len(all_nodes) - 1} edges")


# 3. the branch channel gives a node the field value its tips agree on, and the
# edge above that node draws in the color of the value. Count the edges that
# take a color, field by field.
def shared_values(field):
    value = {}
    for node in reversed(all_nodes):
        if node["children"]:
            seen = {value[id(c)] for c in node["children"]}
            value[id(node)] = seen.pop() if len(seen) == 1 else None
        else:
            value[id(node)] = table[node["name"]][field]
    return value


for field in ("clade", "country", "region"):
    value = shared_values(field)
    colored = sum(1 for n in all_nodes[1:] if value[id(n)] is not None)
    colored_internal = sum(1 for n in internal[1:] if value[id(n)] is not None)
    print(
        f"branch by {field}: {colored}/{len(all_nodes) - 1} edges colored, "
        f"{colored_internal}/{len(internal) - 1} of them above an internal node"
    )


# 4. the largest clade whose tips are exactly the tips under one node. The
# Nextstrain calls nest, so the tips labelled A.D are the ones no deeper call
# covers and they sit on either side of A.D.1 and A.D.3. Two tips under
# different children of that node address it whatever its size, and the leaf
# count under it is what the viewer checks a clade record's `tips` against.
members = collections.defaultdict(set)
for name, fields in table.items():
    members[fields["clade"]].add(name)

mrca_of = {}
for node in all_nodes:
    covered = {t["name"] for t in leaves_of(node)}
    for clade, names in members.items():
        if names <= covered:
            prev = mrca_of.get(clade)
            if prev is None or len(covered) < len(prev[1]):
                mrca_of[clade] = (node, covered)

monophyletic = {
    clade: node
    for clade, (node, covered) in mrca_of.items()
    if covered == members[clade]
}
print(f"{len(monophyletic)} of the {len(members)} clades are one node's tips")
best_clade = max(monophyletic, key=lambda c: len(members[c]))
best = monophyletic[best_clade]
best_tips = [t["name"] for t in leaves_of(best)]
first = next(leaves_of(best["children"][0]))["name"]
last = next(leaves_of(best["children"][-1]))["name"]
print(f"largest of them: {best_clade}, {len(best_tips)} tips")
print(f"  mrca tips: {first} and {last}")


# 5. display row order: the viewer sorts each node's children by branch length,
# shortest first, and reads the tips off in that order, so the row a tip draws
# on is not its line in the file.
def display_rows(node):
    if not node["children"]:
        return [node["name"]]
    rows = []
    for c in sorted(node["children"], key=lambda c: c["length"]):
        rows += display_rows(c)
    return rows


order = display_rows(root)
row_of = {name: i for i, name in enumerate(order)}
runs = []
for i, name in enumerate(order):
    clade = table[name]["clade"]
    if runs and runs[-1][0] == clade:
        runs[-1][2] += 1
    else:
        runs.append([clade, i, 1])
for a, b in zip(runs, runs[1:]):
    if a[2] >= 8 and b[2] >= 8:
        print(
            f"clades meet at display row {b[1]}: "
            f"{a[0]} on rows {a[1]}-{a[1] + a[2] - 1}, "
            f"{b[0]} on rows {b[1]}-{b[1] + b[2] - 1}"
        )
rows = [row_of[name] for name in best_tips]
print(f"{best_clade} spans display rows {min(rows)}-{max(rows)}")

# 6. one tip, its raw node_attrs and the row the table gives it.
label, fields, na = next(t for t in sample if t[0].startswith("MZ221194"))
raw = {k: na[k] for k in ("clade_membership", "country", "region", "num_date") if k in na}
print(f"check tip: {label}")
print(f"  node_attrs: {json.dumps(raw)}")
print(f"  row: {json.dumps(fields)}")
