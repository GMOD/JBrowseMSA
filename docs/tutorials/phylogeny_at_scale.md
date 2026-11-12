# An RSV phylogeny from a public Nextstrain build

A public health lab tracking a virus works with a tree of thousands of tips, one
per genome sequenced that season. Nextstrain publishes such a tree for 1,840
genomes of respiratory syncytial virus A, without an alignment. Its attachment
glycoprotein gene _G_ takes the brunt of antibody selection, and its polymerase
gene _L_, which tolerates almost no change, is the control. From the public
build, we:

- reconstruct an alignment from the tree
- collapse, subsample and zoom until the rows are readable
- count the variable columns in _G_ and _L_
- write a row table and color labels, branches and rows by clade and country
- mark one clade, open the result from one link and check one row against the
  build

## Prerequisites

- Python 3, standard library only

## The data

Nextstrain's RSV-A build, updated 2024-07-16, with its tree, ancestral sequence,
branch substitutions and tip metadata. Nothing to download: the build script
fetches it.

| What it is                                                  | File                                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The auspice JSON itself                                     | [rsv_a_genome.json](https://data.nextstrain.org/rsv_a_genome.json)                             |
| The subsampled whole-genome alignment the later figures use | [rsv-sample.aln](https://gmod.org/JBrowseMSA/demo/data/scale/rsv-sample.aln)                   |
| Its tree                                                    | [rsv-sample.nh](https://gmod.org/JBrowseMSA/demo/data/scale/rsv-sample.nh)                     |
| The subsample's row table                                   | [rsv-sample-rowdata.json](https://gmod.org/JBrowseMSA/demo/data/scale/rsv-sample-rowdata.json) |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                                                                                 | File                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| The full-tip alignment the build script reconstructs from the JSON, sliced to the _G_ gene | [rsv-full.aln](https://gmod.org/JBrowseMSA/demo/data/scale/rsv-full.aln) |
| Its tree                                                                                   | [rsv-full.nh](https://gmod.org/JBrowseMSA/demo/data/scale/rsv-full.nh)   |

</details>

## 1. Reconstruct the alignment from the tree

Every branch in the JSON lists the nucleotide substitutions on it, numbered
against one embedded reference sequence. The script copies the reference down
each root-to-tip path and overwrites one base per mutation, which gives every
tip's genome in the reference's 15,225 coordinates:

```python
def reconstruct(node, seq):
    muts = node.get("branch_attrs", {}).get("mutations", {}).get("nuc", [])
    if muts:
        seq = bytearray(seq)
        for m in muts:
            _ref, pos, alt = MUT_RE.match(m).groups()
            seq[int(pos) - 1] = ord(alt)
        seq = bytes(seq)
    na = node.get("node_attrs", {})
    if not node.get("children"):
        tips.append((label_for(na, node["name"]), seq, na))
    else:
        for child in node["children"]:
            reconstruct(child, seq)
```

```bash
python3 build_phylogeny_at_scale.py .
```

```
reconstructed 1840 tip sequences, genome length 15225
G gene 4652-5617 (966 nt)
L gene 8532-15029 (6498 nt)
```

The rows come out already aligned, because a substitution moves no other base
and this dataset has no insertion relative to the reference. A deletion is a run
of gaps at a fixed position. Each row is named `accession|clade|country|year`,
four fields `label_for` reads off the tip's `node_attrs`.

## 2. Open the whole tree

The first view draws all 1,840 tips at one pixel of row height, beside the
alignment sliced to the _G_ gene.

[![](../media/scale-whole-tree.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1900%2C%22treeAreaWidth%22%3A130%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A1%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-full.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-full.nh%22%7D%7D%7D)

All 1,840 tips at a row height too small for any label or letter. The outline of
the tree shows, and a wide pale gap partway down the alignment marks a deletion
in a large fraction of the rows.

## 3. Collapse a clade

Click a node in the tree to collapse everything under it into one triangle. The
script picks a clade whose tips share one clade call and one country:

```
collapse target: node-0-0-1, 49 tips, clade A.1, all USA
```

[![](../media/scale-collapsed.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A350%2C%22treeAreaWidth%22%3A360%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A10%2C%22scrollY%22%3A-17800%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22collapsed%22%3A%5B%22node-0-0-1%22%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-full.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-full.nh%22%7D%7D%7D)

Clade A.1, 49 tips all sampled in the USA, folded into the triangle marked 49.
The viewer orders each node's children by branch length, shortest first, so the
clade sits in the last 90 rows of 1,840, not the first as in the file.

## 4. Subsample for a readable page

The remaining figures use every 10th tip in the file's order:

```
subsample: 184 of 1840 tips (every 10th)
23 of 24 clades represented in the subsample
```

[![](../media/scale-subsample.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A700%2C%22treeAreaWidth%22%3A420%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A16%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%7D%7D)

The 184-row subsample, with every strain name beside the tree legible. One of
the 24 Nextstrain clades in the full tree has no representative left.

## 5. Zoom in on the variable end

The view at base resolution over columns 5442-5541, inside the _G_ ectodomain,
where all 100 columns vary somewhere in the subsample.

[![](../media/scale-zoom-variable.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A650%2C%22treeAreaWidth%22%3A170%2C%22colWidth%22%3A14%2C%22rowHeight%22%3A16%2C%22scrollX%22%3A-76034%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%7D%7D)

Every column here has more than one letter, and a block of rows in the middle
runs to gap, the deletion that showed as a pale stripe in the whole-tree figure.

## 6. Zoom in on the conserved end

The step 5 view scrolled to columns 10132-10231, inside _L_.

[![](../media/scale-zoom-conserved.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A650%2C%22treeAreaWidth%22%3A170%2C%22colWidth%22%3A14%2C%22rowHeight%22%3A16%2C%22scrollX%22%3A-141694%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%7D%7D)

Almost every row reads the same letter down almost every column, a handful of
rows have a substitution, and no row in this window has a gap.

## 7. Count the variable columns

The script counts the columns that hold more than one letter, over each whole
gene of the subsample and over the two windows above:

```python
def variable_columns(seqs, start1, end1):
    count = 0
    for col in range(start1 - 1, end1):
        alleles = {s[col] for s in seqs} - {ord("N")}
        count += len(alleles) > 1
    return count
```

```
G gene: 612/966 variable columns (63.4%)
L gene: 1802/6498 variable columns (27.7%)
G hotspot (5442-5541): 100/100 variable columns
L coldspot (10132-10231): 15/100 variable columns
```

Over each whole gene, _G_ is more than twice as variable as _L_.

## 8. Write the row table

A channel reads its field from a row table keyed by row name. Four entries of
each tip's `node_attrs` in the auspice JSON hold the fields the rest of this
page draws with:

```python
def fields_for(node_attrs):
    num_date = node_attrs.get("num_date", {}).get("value")
    return {
        "clade": node_attrs.get("clade_membership", {}).get("value", "NA"),
        "country": node_attrs.get("country", {}).get("value", "NA"),
        "region": node_attrs.get("region", {}).get("value", "NA"),
        "year": str(int(num_date)) if num_date is not None else "NA",
    }
```

The script writes one record per subsampled tip:

```
wrote ./rsv-sample-rowdata.json: 184 rows, 21 kB
  clade: 23 distinct values
  country: 28 distinct values
  region: 7 distinct values
  year: 37 distinct values
  clade A.D: 38 rows
  clade A.D.1: 25 rows
  clade A.3.1: 22 rows
  clade A.D.3: 13 rows
  clade A.3: 12 rows
  clade A.D.2.2: 12 rows
```

Percent-encoded into a link, the 21 kB table runs past 20,000 characters, so the
snapshot names the file and the viewer fetches it at startup:

```json
{
  "type": "MsaView",
  "msaFilehandle": { "uri": "data/scale/rsv-sample.aln" },
  "treeFilehandle": { "uri": "data/scale/rsv-sample.nh" },
  "treeMetadataFilehandle": { "uri": "data/scale/rsv-sample-rowdata.json" }
}
```

[![](../media/phylogeny_metadata-row-table.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A700%2C%22treeAreaWidth%22%3A560%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A18%2C%22drawLabels%22%3Atrue%2C%22scrollY%22%3A-1188%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample-rowdata.json%22%7D%7D%7D)

Thirty-eight of the 184 rows with the table loaded and no channel reading it, so
every tip label is in the theme's text color. The callout lists the four fields
of the row it points at.

## 9. Color the tip labels by clade

An `encodings` record names the channel to paint, the field feeding it and the
scale between them. The `tipLabel` channel colors the label beside each tip:

```json
"encodings": [{ "channel": "tipLabel", "field": "clade" }]
```

The 23 clade calls run past the end of every named palette, so leaving out
`range` gives each value an evenly spaced hue. The script prints the display
rows of each clade run of eight rows or more:

```
display rows 72-79: A.D
display rows 80-92: A.D.3
display rows 93-108: A.D
```

[![](../media/phylogeny_metadata-tip-labels.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A700%2C%22treeAreaWidth%22%3A560%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A18%2C%22drawLabels%22%3Atrue%2C%22scrollY%22%3A-1188%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22clade%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample-rowdata.json%22%7D%7D%7D)

Thirty-eight rows from display row 66, with the labels turning from green to
purple on row 80, where the last A.D tip gives way to the first A.D.3 tip, and
back to green on row 93.

## 10. Color the branches by clade

The `branch` channel colors the edge above an internal node with the field value
its tips agree on. Clade calls nest, so the tips under a node agree wherever one
named clade covers them:

```json
"encodings": [{ "channel": "branch", "field": "clade" }]
```

The script counts the same thing off the pruned tree:

```
pruned tree: 184 tips, 363 edges
branch by clade: 293/363 edges colored, 109/179 of them above an internal node
```

Every terminal edge takes a color, since one tip agrees with itself, so the
count to read is the internal one: 109 of 179.

[![](../media/phylogeny_metadata-branch-clade.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1472%2C%22treeAreaWidth%22%3A700%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A8%2C%22drawLabels%22%3Afalse%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22branch%22%2C%22field%22%3A%22clade%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample-rowdata.json%22%7D%7D%7D)

All 184 rows with the tree area widened to 700 px. Color runs from where each
clade splits off out to its tips: green for A.D, purple for A.D.3, magenta for
A.D.5. The backbone down to those splits is black, because the tips under those
deep nodes have more than one clade call.

## 11. Color the branches by country

The `branch` channel over the `country` field tests whether the 28 countries
fall on the tree the way the 23 clades do:

```json
"encodings": [{ "channel": "branch", "field": "country" }]
```

```
branch by clade: 293/363 edges colored, 109/179 of them above an internal node
branch by country: 207/363 edges colored, 23/179 of them above an internal node
```

[![](../media/phylogeny_metadata-branch-country.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1472%2C%22treeAreaWidth%22%3A700%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A8%2C%22drawLabels%22%3Afalse%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22branch%22%2C%22field%22%3A%22country%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample-rowdata.json%22%7D%7D%7D)

The step 10 view over the country field. Color reaches one or two edges deep at
the tips, and the tree inside each clade stays black. The pink run at the top
left, USA genomes on display rows 12 to 18 sampled between 1981 and 1996, is the
one country cluster big enough to see at this scale.

## 12. Tint the rows by clade

The `rowTint` channel washes a color across the whole row, tree gutter and
alignment together, one band per clade:

```json
"encodings": [{ "channel": "rowTint", "field": "clade" }]
```

```
display rows 109-117: A.D.1
display rows 121-136: A.D.1
display rows 146-157: A.D.2.2
```

[![](../media/phylogeny_metadata-row-tint.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1472%2C%22treeAreaWidth%22%3A130%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A8%2C%22drawLabels%22%3Afalse%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22rowTint%22%2C%22field%22%3A%22clade%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample-rowdata.json%22%7D%7D%7D)

All 184 rows, each tinted at 25% opacity from the tree gutter across the
alignment, so the nucleotide colors stay readable. The purple band on rows 80 to
92 is A.D.3, inside green A.D, which splits into runs wherever a sub-clade
branches off it. The blue band on rows 146 to 157 is A.D.2.2.

## 13. Draw a rectangle over one clade

A `clades` record marks a clade of the tree. `mrca` names two tips whose common
ancestor is the clade, and `tips` is the leaf count under that ancestor:

```json
"clades": [
  {
    "mrca": ["330103036|A.D.3|France|2019", "MZ151852|A.D.3|Russia|2020"],
    "tips": 13,
    "mark": "highlight",
    "color": "#ffd54f"
  }
]
```

The script picks the largest clade call whose tips are exactly the tips under
one node:

```
13 of the 23 clades are one node's tips
largest of them: A.D.3, 13 tips
  mrca tips: 330103036|A.D.3|France|2019 and MZ151852|A.D.3|Russia|2020
A.D.3 spans display rows 80-92
```

The viewer resolves the two names' common ancestor and compares its leaf count
with the 13 in the record. Writing 12 there drops the rectangle, so a re-rooted
or re-estimated tree that changes the clade loses the mark.

[![](../media/phylogeny_metadata-clade-highlight.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A700%2C%22treeAreaWidth%22%3A560%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A18%2C%22drawLabels%22%3Atrue%2C%22scrollY%22%3A-1188%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22clade%22%7D%5D%2C%22clades%22%3A%5B%7B%22mrca%22%3A%5B%22330103036%7CA.D.3%7CFrance%7C2019%22%2C%22MZ151852%7CA.D.3%7CRussia%7C2020%22%5D%2C%22tips%22%3A13%2C%22mark%22%3A%22highlight%22%2C%22color%22%3A%22%23ffd54f%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample-rowdata.json%22%7D%7D%7D)

The amber rectangle over display rows 80 to 92, from the branch point the two
named tips share across the labels and the alignment, around 13 purple A.D.3
labels.

## 14. Add a strip of collection years

The `year` field holds numbers, from 1977 to 2024, so a `linear` scale draws it
on a ramp. A `strip` row panel puts one cell per row beside the tree, and the
`tipLabel` channel colors the labels through the same scale:

```json
"encodings": [
  {
    "channel": "tipLabel",
    "field": "year",
    "scale": { "type": "linear", "scheme": "viridis", "domainMin": 1977, "domainMax": 2024 }
  }
],
"rowPanels": [
  {
    "kind": "strip",
    "width": 14,
    "encoding": {
      "fill": {
        "field": "year",
        "scale": { "type": "linear", "scheme": "viridis", "domainMin": 1977, "domainMax": 2024 }
      }
    }
  }
]
```

`domainMin` and `domainMax` pin both ends of the ramp, so the two records
declare one scale and the view lists one gradient legend for them, running from
dark purple at 1977 to yellow at 2024. With an end left unset, each record would
follow its own field's values and list a legend of its own.

[Open the year strip in the app](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A700%2C%22treeAreaWidth%22%3A560%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A18%2C%22drawLabels%22%3Atrue%2C%22scrollY%22%3A-1188%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22year%22%2C%22scale%22%3A%7B%22type%22%3A%22linear%22%2C%22scheme%22%3A%22viridis%22%2C%22domainMin%22%3A1977%2C%22domainMax%22%3A2024%7D%7D%5D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22year%22%2C%22scale%22%3A%7B%22type%22%3A%22linear%22%2C%22scheme%22%3A%22viridis%22%2C%22domainMin%22%3A1977%2C%22domainMax%22%3A2024%7D%7D%7D%2C%22width%22%3A14%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample-rowdata.json%22%7D%7D%7D).
The link opens the readable window of step 9 with the labels and the strip
colored by year.

## 15. Open the link and check one row against the JSON

<!-- usage: web -->

The whole figure travels in one link, and the final view moves the tint to the
`region` field:

```json
"encodings": [
  { "channel": "tipLabel", "field": "clade" },
  { "channel": "rowTint", "field": "region" }
]
```

[![](../media/phylogeny_metadata-shared-link.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A700%2C%22treeAreaWidth%22%3A560%2C%22colWidth%22%3A0.3%2C%22rowHeight%22%3A18%2C%22drawLabels%22%3Atrue%2C%22scrollY%22%3A-1188%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22clade%22%7D%2C%7B%22channel%22%3A%22rowTint%22%2C%22field%22%3A%22region%22%7D%5D%2C%22clades%22%3A%5B%7B%22mrca%22%3A%5B%22330103036%7CA.D.3%7CFrance%7C2019%22%2C%22MZ151852%7CA.D.3%7CRussia%7C2020%22%5D%2C%22tips%22%3A13%2C%22mark%22%3A%22highlight%22%2C%22color%22%3A%22%23ffd54f%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.aln%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample.nh%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fscale%2Frsv-sample-rowdata.json%22%7D%7D%7D)

Labels colored by clade, rows tinted by region, the A.D.3 rectangle over rows 80
to 92, and one legend per field. Inside the rectangle the region tint changes
from row to row. The red box marks the row the check below reads.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) reads the same three files, with
one `scale_row_color()` layer per encoding, one `geom_msa_clade()` and a strip
per field beside the tree:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/scale/"
rows <- jsonlite::fromJSON(paste0(data, "rsv-sample-rowdata.json"))
w <- msaview(msa = paste0(data, "rsv-sample.aln"),
    tree = paste0(data, "rsv-sample.nh"), color_scheme = "nucleotide") +
  geom_msa_rowdata(rows) +
  scale_row_color("clade", channel = "tipLabel") +
  scale_row_color("region", channel = "rowTint") +
  geom_msa_strip("clade") +
  geom_msa_strip("region") +
  geom_msa_clade(mrca = c("330103036|A.D.3|France|2019",
    "MZ151852|A.D.3|Russia|2020"), tips = 13, color = "#ffd54f")
w
ggplot2::ggsave("phylogeny_metadata-shared-link-r.png", msaview_plot(w),
  width = 12, height = 12)
```

![](../media/phylogeny_metadata-shared-link-r.png)

All 184 tips over the whole genome, with clade and region strips beside the tree
and the amber wash over the 13 A.D.3 tips.

<!-- /usage -->

The boxed row is the tip the script prints last, its auspice JSON entry beside
its row table record:

```
check tip: RSVA/20200035/BJ/CHN/2020.01.09|A.D.3|China|2020, display row 88
  node_attrs: {"clade_membership": {"value": "A.D.3"}, "country": {"value": "China", "confidence": {"China": 1.0}, "entropy": -1.000088900581841e-12}, "region": {"value": "Asia"}, "num_date": {"value": 2020.0232240437158}}
  row: {"clade": "A.D.3", "country": "China", "region": "Asia", "year": "2020"}
```

On screen the row has the purple A.D.3 label, sits inside the amber rectangle
and has the Asia tint. The date rounds down to 2020, the last field of the row
name.

## Reproduce it end to end

[`build_phylogeny_at_scale.py`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_phylogeny_at_scale.py)
is the script step 1 runs, and it builds every file on this page:

1. It fetches Nextstrain's RSV-A build and rebuilds each tip's genome from the
   root sequence and the substitutions on its path, so the rows come out aligned
   with no aligner.
2. It writes all 1,840 tips sliced to the _G_ gene, and every 10th tip as whole
   genomes, each with a pruned tree.
3. It writes the subsample's clade, country, region and year as a row table
   keyed by row name.
4. It prints the numbers the page quotes, from the clade to collapse to one tip
   checked against its raw metadata.

It needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_phylogeny_at_scale.py
python3 build_phylogeny_at_scale.py .
```

The argument is the directory to write to.

## See also

- [An H5N1 surveillance figure](https://gmod.org/JBrowseMSA/tutorials/influenza_surveillance_figure)
- [A protein family from a list of accessions](https://gmod.org/JBrowseMSA/tutorials/protein_family)
- [User guide](https://gmod.org/JBrowseMSA/guide)
- [Data layers](https://gmod.org/JBrowseMSA/layers)

## References

- Hadfield J, Megill C, Bell SM, et al. Nextstrain: real-time tracking of
  pathogen evolution. _Bioinformatics_ 34:4121-4123.
- Johnson PR, Spriggs MK, Olmsted RA, Collins PL. The G glycoprotein of human
  respiratory syncytial viruses of subgroups A and B: extensive sequence
  divergence between antigenic subgroups. _Proc Natl Acad Sci USA_ 84:5625-5629.
- Goya S, Galiano M, Nauwelaers I, et al. Toward unified molecular surveillance
  of RSV: a proposal for genotype definition and nomenclature harmonized with
  WHO clinical severity groups. _Influenza Other Respir Viruses_ 14:274-285.
- Yu G, Smith DK, Zhu H, Guan Y, Lam TT. ggtree: an R package for visualization
  and annotation of phylogenetic trees with their covariates and other
  associated data. _Methods Ecol Evol_ 8:28-36.
