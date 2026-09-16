#!/usr/bin/env python3
"""Build the files for docs/tutorials/influenza_surveillance_figure.md.

Fetch Nextstrain's H5N1 cattle-outbreak genome build, subsample it, and write
the four files the figure loads: the HA alignment, the tree, the row table and
the snapshot layers. Print every number the tutorial quotes.

  python3 build_influenza_surveillance_figure.py [outdir]

Needs: python3, standard library only.

The build is pinned to a dated snapshot, so a rerun writes the same files and
prints the same numbers as the page.

Two notes on what this build publishes:

* The per-segment GenoFLU lineage is one constellation here, B3.13 in every
  tip, because the build is the cattle outbreak and GenoFLU names a genotype by
  its eight segment lineages. The eight strips in the figure therefore read an
  amino-acid site per segment, picked below as the site whose minor state the
  most sampled tips carry, plus the metadata fields the build records per tip.
  The builds that do carry a per-segment lineage per tip, avian-flu/h5n1/<seg>/2y,
  are assembled from GISAID as well as GenBank, and the GISAID database access
  agreement does not allow the sequences to be redistributed, so this page
  stays on the GenBank-and-SRA build.
* The tree carries no bootstrap or posterior support. Nextstrain infers it with
  IQ-TREE and publishes divergence and inferred dates per node, so the Newick
  written here has no internal node labels.
"""

import collections
import json
import os
import re
import sys
import urllib.request

DATASET = "avian-flu/h5n1-cattle-outbreak/genome"
PINNED = "2026-09-15"
URL = f"https://nextstrain.org/{DATASET}@{PINNED}"
ACCEPT = "application/vnd.nextstrain.dataset.main+json"
# every 24th eligible tip, which lands a 200-row figure
STEP = 24
BL_PLACES = 7
# the metadata fields the row table carries beside the per-segment sites
META_FIELDS = ("genotype", "host", "state", "year", "cleavage site")

out = sys.argv[1] if len(sys.argv) > 1 else "."
os.makedirs(out, exist_ok=True)
local = os.path.join(out, "h5n1-cattle-outbreak-genome.json")
if not os.path.exists(local):
    print(f"fetching {URL}")
    req = urllib.request.Request(URL, headers={"Accept": ACCEPT})
    with urllib.request.urlopen(req) as resp, open(local, "wb") as fh:
        fh.write(resp.read())
with open(local) as fh:
    build = json.load(fh)
tree = build["tree"]
root_seq = build["root_sequence"]
meta = build["meta"]
annotations = meta["genome_annotations"]
genome_len = len(root_seq["nuc"])
print(f"build updated {meta['updated']}, genome {genome_len} nt")

# one gene per segment, in segment order, each the gene the segment is named
# for. M2 and NS2 are spliced products of the MP and NS segments, so the
# per-segment site below reads M1 and NS1.
SEGMENT_GENES = ("PB2", "PB1", "PA", "HA", "NP", "NA", "M1", "NS1")
MUT_RE = re.compile(r"^([A-Za-z*-])(\d+)([A-Za-z*-])$")


def fields_for(node_attrs):
    """The metadata a tip carries, as the row table's fields.

    `division_metadata` is the collecting state as the record reports it, where
    `division` is the state Nextstrain infers for a tip whose record has none.
    An inferred value follows the tree by construction, so the strip reads the
    reported one and a tip without it drops out of the sample below.
    """
    num_date = node_attrs.get("num_date", {}).get("value")
    return {
        "genotype": node_attrs.get("genoflu", {}).get("value", ""),
        "host": node_attrs.get("host", {}).get("value", ""),
        "state": node_attrs.get("division_metadata", {}).get("value", ""),
        "year": str(int(num_date)) if num_date is not None else "",
        "cleavage site": node_attrs.get("cleavage_site_sequence", {}).get(
            "value", ""
        ),
    }


# 1. every tip, with its nucleotide genome and its per-gene protein sequence
# reconstructed by copying the root sequence down the path and applying one
# substitution per mutation. Nextstrain numbers every mutation against the same
# reference, so the tips come out as an alignment.
tips = []


def apply_muts(seq, muts):
    if not muts:
        return seq
    edited = bytearray(seq)
    for mut in muts:
        m = MUT_RE.match(mut)
        if m:
            _, pos, alt = m.groups()
            index = int(pos) - 1
            if index < len(edited):
                edited[index] = ord(alt)
    return bytes(edited)


def reconstruct(node, nuc, aa):
    muts = node.get("branch_attrs", {}).get("mutations", {})
    nuc = apply_muts(nuc, muts.get("nuc"))
    aa = {
        gene: apply_muts(seq, muts.get(gene)) for gene, seq in aa.items()
    }
    kids = node.get("children")
    if kids:
        for kid in kids:
            reconstruct(kid, nuc, aa)
    else:
        na = node.get("node_attrs", {})
        tips.append(
            {
                "name": re.sub(r"\s+", "_", node["name"]),
                "nuc": nuc,
                "aa": aa,
                "div": na.get("div", 0),
                "attrs": na,
                "fields": fields_for(na),
            }
        )


reconstruct(
    tree,
    root_seq["nuc"].encode(),
    {gene: root_seq[gene].encode() for gene in SEGMENT_GENES},
)
print(f"reconstructed {len(tips)} tips")
sources = collections.Counter(
    t["attrs"].get("data_source", {}).get("value") for t in tips
)
print(f"  data source: {dict(sources)}")

# 2. the sample: tips whose record names a GenBank accession and a collecting
# state, every 24th in the build's own tip order, which keeps the proportions
# of the whole build with no seed to explain.
eligible = [
    t
    for t in tips
    if t["attrs"].get("genbank_accession", {}).get("value")
    and t["fields"]["state"]
]
print(f"{len(eligible)} tips have a GenBank accession and a reported state")
sample = eligible[::STEP]
sample_names = {t["name"] for t in sample}
print(f"sample: every {STEP}th of them, {len(sample)} tips")
for field in META_FIELDS:
    values = collections.Counter(t["fields"][field] for t in sample)
    top = ", ".join(f"{v} {n}" for v, n in values.most_common(4))
    print(f"  {field}: {len(values)} values ({top})")

# 3. the per-segment site: for each segment's gene, the amino-acid site whose
# minor state the most sampled tips carry. X is the state of a tip whose codon
# the assembly left ambiguous, so it counts toward neither state.
site_of = {}
for gene in SEGMENT_GENES:
    length = len(root_seq[gene])
    best = None
    for i in range(length):
        states = collections.Counter(
            chr(t["aa"][gene][i]) for t in sample if i < len(t["aa"][gene])
        )
        called = [(n, s) for s, n in states.items() if s not in ("X", "-")]
        if len(called) < 2:
            continue
        called.sort(reverse=True)
        minor = sum(n for n, _s in called[1:])
        if best is None or minor > best[0]:
            best = (minor, i + 1, dict(states))
    minor, position, states = best
    site_of[gene] = position
    order = sorted(states.items(), key=lambda kv: -kv[1])
    shown = ", ".join(f"{s} {n}" for s, n in order)
    print(f"  {gene} {position}: {shown}")

# the row table: the metadata fields plus one field per segment, named for the
# gene and the site, so a strip's header names what its column reads
table = {}
for t in sample:
    row = dict(t["fields"])
    for gene in SEGMENT_GENES:
        row[f"{gene} {site_of[gene]}"] = chr(t["aa"][gene][site_of[gene] - 1])
    table[t["name"]] = row
SEGMENT_FIELDS = [f"{gene} {site_of[gene]}" for gene in SEGMENT_GENES]
path = os.path.join(out, "h5n1-rowdata.json")
with open(path, "w") as fh:
    json.dump(table, fh, indent=0, sort_keys=True)
    fh.write("\n")
print(f"wrote {path}: {len(table)} rows, {os.path.getsize(path) / 1024:.0f} kB")
residues = sorted({row[f] for row in table.values() for f in SEGMENT_FIELDS})
print(f"the eight segment columns hold {len(residues)} states: {' '.join(residues)}")

# 4. the HA alignment: the HA coding sequence of each sampled genome, cut from
# the reconstructed genome at the coordinates the build annotates.
ha = annotations["HA"]
ha_start, ha_end = ha["start"], ha["end"]
path = os.path.join(out, "h5n1-ha.fa")
with open(path, "w") as fh:
    for t in sample:
        fh.write(f">{t['name']}\n{t['nuc'][ha_start - 1:ha_end].decode()}\n")
print(
    f"wrote {path}: {len(sample)} rows, {ha_end - ha_start + 1} columns "
    f"(HA {ha_start}-{ha_end} of the genome), "
    f"{os.path.getsize(path) / 1024:.0f} kB"
)


# 5. the tree: the build's own topology pruned to the sample. A node left with
# one surviving child is spliced out, and `div` is cumulative from the root, so
# the branch above any surviving node is its div minus its nearest surviving
# ancestor's.
def prune(node):
    kids = node.get("children")
    na = node.get("node_attrs", {})
    div = na.get("div", 0)
    if not kids:
        name = re.sub(r"\s+", "_", node["name"])
        if name not in sample_names:
            return None
        return {"name": name, "div": div, "children": []}
    surviving = [c for c in (prune(k) for k in kids) if c is not None]
    if not surviving:
        return None
    if len(surviving) == 1:
        return surviving[0]
    return {"name": "", "div": div, "children": surviving}


def set_lengths(node, parent_div):
    node["length"] = float(f"{max(node['div'] - parent_div, 0):.{BL_PLACES}f}")
    for kid in node["children"]:
        set_lengths(kid, node["div"])


def newick(node):
    body = (
        f"({','.join(newick(k) for k in node['children'])})"
        if node["children"]
        else node["name"]
    )
    return f"{body}:{node['length']:.{BL_PLACES}f}"


root = prune(tree)
set_lengths(root, 0)
path = os.path.join(out, "h5n1.nwk")
with open(path, "w") as fh:
    fh.write(newick(root) + ";\n")


def nodes_of(node):
    yield node
    for kid in node["children"]:
        yield from nodes_of(kid)


def leaves_of(node):
    if not node["children"]:
        yield node
    else:
        for kid in node["children"]:
            yield from leaves_of(kid)


all_nodes = list(nodes_of(root))
internal = [n for n in all_nodes if n["children"]]
print(
    f"wrote {path}: {len(all_nodes) - len(internal)} tips, "
    f"{len(internal)} internal nodes, {len(all_nodes) - 1} edges"
)


# 6. how far each field follows the tree, counted the way the branch channel
# colors an edge: a node takes the field value its tips agree on, and the edge
# above it draws in that value's color. The clade count is the number of
# maximal such nodes, so a field that follows the tree perfectly has one clade
# per value.
def shared_values(field):
    value = {}
    for node in reversed(all_nodes):
        if node["children"]:
            seen = {value[id(c)] for c in node["children"]}
            value[id(node)] = seen.pop() if len(seen) == 1 else None
        else:
            value[id(node)] = table[node["name"]][field]
    return value


parent_of = {}
for node in all_nodes:
    for kid in node["children"]:
        parent_of[id(kid)] = node


def clade_count(field):
    value = shared_values(field)
    maximal = 0
    for node in all_nodes:
        if value[id(node)] is None:
            continue
        parent = parent_of.get(id(node))
        if parent is None or value[id(parent)] != value[id(node)]:
            maximal += 1
    colored = sum(1 for n in all_nodes[1:] if value[id(n)] is not None)
    colored_internal = sum(1 for n in internal[1:] if value[id(n)] is not None)
    return maximal, colored, colored_internal


for field in [*META_FIELDS, *SEGMENT_FIELDS]:
    values = {row[field] for row in table.values()}
    maximal, colored, colored_internal = clade_count(field)
    print(
        f"{field}: {len(values)} values in {maximal} clades, "
        f"{colored}/{len(all_nodes) - 1} edges colored, "
        f"{colored_internal}/{len(internal) - 1} of them above an internal node"
    )


# 7. display row order: the viewer sorts each node's children by branch length,
# shortest first, and reads the tips off in that order, so a tip's row is not
# its line in the file.
def display_rows(node):
    if not node["children"]:
        return [node["name"]]
    rows = []
    for kid in sorted(node["children"], key=lambda k: k["length"]):
        rows += display_rows(kid)
    return rows


order = display_rows(root)
row_of = {name: i for i, name in enumerate(order)}

# 8. the groups a clade record can mark: for each value of a field, the
# smallest node covering every tip that carries it. A group the node covers
# exactly is a clade, addressed by two tips under different children of that
# node plus the leaf count the viewer checks. A group that is a run of display
# rows and nothing else is a range, addressed by its two ends.
members = {}
for field in ("state", "host"):
    for value in {row[field] for row in table.values()}:
        names = {n for n, row in table.items() if row[field] == value}
        if len(names) >= 4:
            members[f"{field} {value}"] = names
# a segment site's tips group by the state that differs from the root's, since
# the tips keeping the root state are the ones the substitution never reached
for gene, field in zip(SEGMENT_GENES, SEGMENT_FIELDS):
    root_state = root_seq[gene][site_of[gene] - 1]
    counts = collections.Counter(row[field] for row in table.values())
    for value, count in counts.items():
        if count >= 4 and value not in ("X", root_state):
            members[f"{field} {root_state}->{value}"] = {
                n for n, row in table.items() if row[field] == value
            }


def smallest_covering(names):
    best = None
    for node in all_nodes:
        covered = {t["name"] for t in leaves_of(node)}
        if names <= covered and (best is None or len(covered) < len(best[1])):
            best = (node, covered)
    return best


def mrca_pair(node):
    first = next(leaves_of(node["children"][0]))["name"]
    last = next(leaves_of(node["children"][-1]))["name"]
    return first, last


for key, names in members.items():
    node, covered = smallest_covering(names)
    rows = sorted(row_of[n] for n in names)
    span = rows[-1] - rows[0] + 1
    if covered == names:
        first, last = mrca_pair(node)
        print(
            f"{key}: a clade of {len(names)} tips, "
            f"display rows {rows[0]}-{rows[-1]}"
        )
        print(f"  mrca tips: {first} and {last}")
    elif span == len(names):
        print(
            f"{key}: a run of {len(names)} display rows "
            f"{rows[0]}-{rows[-1]}, not a clade"
        )
        print(f"  range ends: {order[rows[0]]} and {order[rows[-1]]}")
    else:
        print(
            f"{key}: {len(names)} tips over display rows "
            f"{rows[0]}-{rows[-1]}, neither a clade nor a run; "
            f"the smallest node covering them has {len(covered)} tips"
        )

# 9. the clades a bracket can label: for each state, the largest clade whose
# tips all come from it, and the longest run of display rows a state holds on
# its own.
for field in ("state", "host"):
    for value, count in collections.Counter(
        row[field] for row in table.values()
    ).most_common(3):
        pure = None
        for node in internal:
            names = [t["name"] for t in leaves_of(node)]
            if all(table[n][field] == value for n in names):
                if pure is None or len(names) > len(pure[1]):
                    pure = (node, names)
        if pure is None:
            continue
        node, names = pure
        rows = sorted(row_of[n] for n in names)
        first, last = mrca_pair(node)
        print(
            f"largest all-{value} clade: {len(names)} of the {count} "
            f"{value} tips, display rows {rows[0]}-{rows[-1]}"
        )
        print(f"  mrca tips: {first} and {last}")
        runs = []
        for i, name in enumerate(order):
            same = table[name][field] == value
            if runs and runs[-1][0] == same:
                runs[-1][2] += 1
            else:
                runs.append([same, i, 1])
        best_run = max((r for r in runs if r[0]), key=lambda r: r[2])
        start, length = best_run[1], best_run[2]
        run_names = order[start : start + length]
        node, covered = smallest_covering(set(run_names))
        print(
            f"  longest run of {value} rows: {length} rows "
            f"{start}-{start + length - 1}, "
            f"{'a clade' if covered == set(run_names) else 'not a clade'}"
        )
        print(f"  range ends: {run_names[0]} and {run_names[-1]}")

# 10. the clade to collapse: the largest node whose tips share one state and one
# host, which is a single state's dairy cattle and nothing else.
collapse = None
for node in internal:
    names = [t["name"] for t in leaves_of(node)]
    states = {table[n]["state"] for n in names}
    hosts = {table[n]["host"] for n in names}
    if len(states) == 1 and len(hosts) == 1:
        if collapse is None or len(names) > len(collapse[1]):
            collapse = (node, names)
node, names = collapse
first, last = mrca_pair(node)
rows = sorted(row_of[n] for n in names)
print(
    f"collapse target: {len(names)} tips, all {table[names[0]]['host']} "
    f"from {table[names[0]]['state']}, display rows {rows[0]}-{rows[-1]}"
)
print(f"  mrca tips: {first} and {last}")

# 11. one tip read against the build: its raw node_attrs beside the row the
# table gives it.
check = max(
    (t for t in sample if t["fields"]["host"] == "Human"),
    key=lambda t: t["attrs"]["num_date"]["value"],
)
raw = {
    key: check["attrs"][key]
    for key in (
        "genbank_accession",
        "genoflu",
        "host",
        "division_metadata",
        "num_date",
        "cleavage_site_sequence",
    )
    if key in check["attrs"]
}
print(f"check tip: {check['name']}, display row {row_of[check['name']]}")
print(f"  node_attrs: {json.dumps(raw)}")
print(f"  row: {json.dumps(table[check['name']])}")
for gene in SEGMENT_GENES:
    site = site_of[gene]
    state = chr(check["aa"][gene][site - 1])
    root_state = root_seq[gene][site - 1]
    print(f"  {gene} {site}: {state} (root {root_state})")
