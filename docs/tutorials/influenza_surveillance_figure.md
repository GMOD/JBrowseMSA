# An H5N1 surveillance figure

Nextstrain's H5N1 cattle-outbreak build places 5,608 genomes on one tree, with a
host, a collecting state, a collection date and a GenoFLU genotype for each.
Drawn beside the tree, those fields show which follow the phylogeny and which
follow the sampling. From 204 of the genomes, we:

- reconstruct the HA alignment and write a row table of host, state and one
  amino-acid site per segment
- color the tip labels and branches by state
- add nine strips between the tree and the alignment
- mark three groups, collapse a clade and focus a subtree under an overview
- open the figure from one link and check one row against the build

## Prerequisites

- Python 3, standard library only

## The data

One dated snapshot of Nextstrain's H5N1 cattle-outbreak genome build. The build
script fetches it. Nothing to download.

| What it is                                                                | File                                                                                         |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The build every field and every sequence comes from, pinned to 2026-09-15 | [genome@2026-09-15](https://nextstrain.org/avian-flu/h5n1-cattle-outbreak/genome@2026-09-15) |

<details>
<summary>The files this page writes, hosted for the figure links</summary>

| What it is                 | File                                                                              |
| -------------------------- | --------------------------------------------------------------------------------- |
| The HA alignment, 204 rows | [h5n1-ha.fa](https://gmod.org/JBrowseMSA/demo/data/h5n1/h5n1-ha.fa)               |
| Its tree                   | [h5n1.nwk](https://gmod.org/JBrowseMSA/demo/data/h5n1/h5n1.nwk)                   |
| The row table              | [h5n1-rowdata.json](https://gmod.org/JBrowseMSA/demo/data/h5n1/h5n1-rowdata.json) |

</details>

## 1. Reconstruct and sample the build

The script rebuilds every tip from the build's root sequence and branch
mutations, as
[the RSV tutorial](https://gmod.org/JBrowseMSA/tutorials/phylogeny_at_scale#1-reconstruct-the-alignment-from-the-tree)
does, then keeps every 24th tip whose record names a GenBank accession and a
collecting state:

```bash
python3 build_influenza_surveillance_figure.py .
```

```
build updated 2026-09-14, genome 13590 nt
reconstructed 5608 tips
  data source: {'genbank': 4879, 'sra-via-andersen-lab': 729}
4878 tips have a GenBank accession and a reported state
sample: every 24th of them, 204 tips
  genotype: 1 values (B3.13 204)
  host: 4 values (Cattle 177, Avian 16, Nonhuman Mammal 7, Human 4)
  state: 16 values (California 111, Idaho 34, Texas 15, Colorado 14)
  year: 3 values (2024 139, 2025 57, 2026 8)
  cleavage site: 3 values (RRKR 185, RKKR 18, RRRR 1)
```

All 204 tips have the same GenoFLU genotype, B3.13, so the figure reads one
amino-acid site per segment in its place.

## 2. Write the row table

For each segment's gene, the script picks the amino-acid site where the most
sampled tips differ from the majority state:

```python
for i in range(length):
    states = collections.Counter(
        chr(t["aa"][gene][i]) for t in sample if i < len(t["aa"][gene])
    )
    called = [(n, s) for s, n in states.items() if s not in ("X", "-")]
    if len(called) < 2:
        continue
    called.sort(reverse=True)
    minor = sum(n for n, _s in called[1:])
```

```
  PB2 670: R 134, K 70
  PB1 517: I 195, V 9
  PA 432: I 137, V 66, T 1
  HA 147: V 117, M 86, I 1
  NP 119: V 138, I 66
  NA 71: S 177, N 25, X 1, I 1
  M1 82: N 138, S 66
  NS1 67: G 138, R 66
```

The script writes the five metadata fields and the eight sites, each named for
its gene and position, to one file keyed by tip name:

```
wrote ./h5n1-rowdata.json: 204 rows, 53 kB
the eight segment columns hold 10 states: G I K M N R S T V X
wrote ./h5n1-ha.fa: 204 rows, 1707 columns (HA 6937-8643 of the genome), 348 kB
wrote ./h5n1.nwk: 204 tips, 149 internal nodes, 352 edges
```

Nextstrain infers the tree with IQ-TREE and publishes a divergence and a date
per node, so the pruned Newick has no support values. A 53 kB table runs past
the 8,192-character request line a link fits in, so the snapshot names the three
files and the viewer fetches them at startup:

```json
{
  "type": "MsaView",
  "msaFilehandle": { "uri": "data/h5n1/h5n1-ha.fa" },
  "treeFilehandle": { "uri": "data/h5n1/h5n1.nwk" },
  "treeMetadataFilehandle": { "uri": "data/h5n1/h5n1-rowdata.json" }
}
```

[![](../media/influenza_surveillance_figure-rows.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A700%2C%22treeAreaWidth%22%3A560%2C%22colWidth%22%3A0.35%2C%22rowHeight%22%3A18%2C%22drawLabels%22%3Atrue%2C%22scrollY%22%3A-738%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-ha.fa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-rowdata.json%22%7D%7D%7D)

Thirty-eight rows from display row 41, with the table loaded and no channel
reading it, so every tip label is in the theme's text color. The callout lists
five of the row's thirteen fields.

## 3. Color labels and branches by state

Two encodings point the `tipLabel` and `branch` channels at the state field, as
the
[RSV tutorial](https://gmod.org/JBrowseMSA/tutorials/phylogeny_at_scale#9-color-the-tip-labels-by-clade)
does with its clade field:

```json
"encodings": [
  { "channel": "tipLabel", "field": "state" },
  { "channel": "branch", "field": "state" }
]
```

[![](../media/influenza_surveillance_figure-lineage.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A700%2C%22treeAreaWidth%22%3A560%2C%22colWidth%22%3A0.35%2C%22rowHeight%22%3A18%2C%22drawLabels%22%3Atrue%2C%22scrollY%22%3A-1890%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22state%22%7D%2C%7B%22channel%22%3A%22branch%22%2C%22field%22%3A%22state%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-ha.fa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-rowdata.json%22%7D%7D%7D)

Display rows 105 to 142, where the 17-row Idaho run starts. California labels
are red and Idaho labels yellow, with one green Nevada tip among the California
rows and one purple Utah tip in the Idaho block. The backbone above the Idaho
rows is black, because the tips under those nodes have both states.

## 4. Add nine strips between the tree and the alignment

A `rowPanels` record draws a column of cells, one per row, between the tree and
the alignment. One strip reads host, and eight read the segment sites through
one scale over amino acids, so a state keeps its color across the matrix:

```json
{
  "kind": "strip",
  "encoding": {
    "fill": {
      "field": "PB2 670",
      "scale": {
        "domain": ["G", "I", "K", "M", "N", "R", "S", "T", "V", "X"],
        "range": [
          "#4e79a7",
          "#f28e2b",
          "#e15759",
          "#76b7b2",
          "#59a14f",
          "#edc948",
          "#b07aa1",
          "#ff9da7",
          "#9c755f",
          "#bab0ac"
        ]
      },
      "legend": { "title": "amino acid" }
    }
  },
  "width": 11
}
```

The other seven site strips repeat the record with a different `field`, and
their shared `legend.title` lists the ten amino-acid states once.

[![](../media/influenza_surveillance_figure-matrix.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1700%2C%22treeAreaWidth%22%3A430%2C%22colWidth%22%3A0.35%2C%22rowHeight%22%3A8%2C%22drawLabels%22%3Afalse%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22branch%22%2C%22field%22%3A%22state%22%7D%5D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22host%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22Avian%22%2C%22Cattle%22%2C%22Human%22%2C%22Nonhuman%20Mammal%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%238c6d31%22%2C%22%23e15759%22%2C%22%23b07aa1%22%5D%7D%7D%7D%2C%22width%22%3A12%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB2%20670%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB1%20517%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PA%20432%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22HA%20147%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NP%20119%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NA%2071%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22M1%2082%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NS1%2067%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-ha.fa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-rowdata.json%22%7D%7D%7D)

All 204 rows, branches colored by state, with the nine strips between the tree
and the HA alignment. NP 119, M1 82 and NS1 67 read one state over exactly
display rows 41 to 178 and another outside them, PB2 670 and PA 432 nearly so,
while HA 147 and NA 71 change many times down the column.

## 5. Measure how far each field follows the tree

The script counts, for each field, the maximal clades its values cut the tree
into and the edges that take a color. A field that follows the tree perfectly
has one clade per value:

```
host: 4 values in 112 clades, 285/352 edges colored, 81/148 of them above an internal node
state: 16 values in 86 clades, 297/352 edges colored, 93/148 of them above an internal node
NP 119: 2 values in 15 clades, 345/352 edges colored, 141/148 of them above an internal node
M1 82: 2 values in 15 clades, 345/352 edges colored, 141/148 of them above an internal node
NS1 67: 2 values in 15 clades, 345/352 edges colored, 141/148 of them above an internal node
```

The state field is the build's `division_metadata`, the state each record
reports. Its `division` field fills in a state Nextstrain infers from the tree,
so it follows the tree by construction.

Two strips set the extremes side by side, NP 119 in 15 clades and host in 112.

[![](../media/influenza_surveillance_figure-control.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1700%2C%22treeAreaWidth%22%3A430%2C%22colWidth%22%3A0.35%2C%22rowHeight%22%3A8%2C%22drawLabels%22%3Afalse%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NP%20119%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%7D%7D%2C%22width%22%3A16%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22host%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22Avian%22%2C%22Cattle%22%2C%22Human%22%2C%22Nonhuman%20Mammal%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%238c6d31%22%2C%22%23e15759%22%2C%22%23b07aa1%22%5D%7D%7D%7D%2C%22width%22%3A16%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-ha.fa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-rowdata.json%22%7D%7D%7D)

The NP 119 and host strips over all 204 rows. NP 119 reads as three blocks: 41
orange I rows, the 138 brown V rows of the clade, and 25 orange I rows at the
bottom. Host reads as a brown column of cattle speckled with the 16 avian, 7
nonhuman-mammal and 4 human rows, which sit wherever the sampling put them.

## 6. Mark three groups in the gutter

A `clades` record marks a group of rows. `mrca` and `tips` address a clade as
the
[RSV tutorial's rectangle](https://gmod.org/JBrowseMSA/tutorials/phylogeny_at_scale#13-draw-a-rectangle-over-one-clade)
does, and `range` names the first and last row of a run that is not a clade.
`highlight` fills the rows, and `bracket` draws a labeled bar in the gutter:

```json
"clades": [
  {
    "mrca": ["A/cattle/CA/24-027807-002-original/2024", "A/chicken/CA/24-031285-004-original/2024"],
    "tips": 138,
    "mark": "bracket",
    "color": "#a16207",
    "label": "NP 119V, 138"
  },
  {
    "range": ["A/cattle/ID/25-012902-006-original/2025", "A/cattle/ID/26G09268-001-original/2026"],
    "tips": 17,
    "mark": "bracket",
    "color": "#1d4ed8",
    "label": "Idaho, 17"
  }
]
```

The script finds all three groups on the pruned tree:

```
NP 119 I->V: a clade of 138 tips, display rows 41-178
  mrca tips: A/cattle/CA/24-027807-002-original/2024 and A/chicken/CA/24-031285-004-original/2024
largest all-California clade: 38 of the 111 California tips, display rows 45-82
  mrca tips: A/chicken/CA/24-031667-001-original/2024 and A/cattle/CA/24-037821-002-original/2024
  longest run of Idaho rows: 17 rows 113-129, not a clade
  range ends: A/cattle/ID/25-012902-006-original/2025 and A/cattle/ID/26G09268-001-original/2026
```

The 138 tips have NP 119V, M1 82N and NS1 67G, so one bracket covers all three
sites.

[![](../media/influenza_surveillance_figure-clades.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1700%2C%22treeAreaWidth%22%3A430%2C%22colWidth%22%3A0.35%2C%22rowHeight%22%3A8%2C%22drawLabels%22%3Afalse%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22branch%22%2C%22field%22%3A%22state%22%7D%5D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22host%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22Avian%22%2C%22Cattle%22%2C%22Human%22%2C%22Nonhuman%20Mammal%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%238c6d31%22%2C%22%23e15759%22%2C%22%23b07aa1%22%5D%7D%7D%7D%2C%22width%22%3A12%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB2%20670%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB1%20517%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PA%20432%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22HA%20147%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NP%20119%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NA%2071%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22M1%2082%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NS1%2067%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%5D%2C%22clades%22%3A%5B%7B%22mrca%22%3A%5B%22A%2Fcattle%2FCA%2F24-027807-002-original%2F2024%22%2C%22A%2Fchicken%2FCA%2F24-031285-004-original%2F2024%22%5D%2C%22tips%22%3A138%2C%22mark%22%3A%22highlight%22%2C%22color%22%3A%22%23ffd54f%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fcattle%2FCA%2F24-027807-002-original%2F2024%22%2C%22A%2Fchicken%2FCA%2F24-031285-004-original%2F2024%22%5D%2C%22tips%22%3A138%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%23a16207%22%2C%22label%22%3A%22NP%20119V%2C%20138%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fchicken%2FCA%2F24-031667-001-original%2F2024%22%2C%22A%2Fcattle%2FCA%2F24-037821-002-original%2F2024%22%5D%2C%22tips%22%3A38%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%23c2410c%22%2C%22label%22%3A%22California%2C%2038%22%7D%2C%7B%22range%22%3A%5B%22A%2Fcattle%2FID%2F25-012902-006-original%2F2025%22%2C%22A%2Fcattle%2FID%2F26G09268-001-original%2F2026%22%5D%2C%22tips%22%3A17%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%231d4ed8%22%2C%22label%22%3A%22Idaho%2C%2017%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-ha.fa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-rowdata.json%22%7D%7D%7D)

An amber rectangle covers display rows 41 to 178. Three bars in the gutter mark
the 38-tip California clade in orange, the 138-tip NP 119V clade in brown and
the 17 Idaho rows in blue, which sit together without descending from one node.

## 7. Collapse a clade

A `collapse` mark folds a clade into one triangle and drops its rows from the
alignment. The script picks the largest node whose tips share one state and one
host:

```
collapse target: 31 tips, all Cattle from California, display rows 147-177
  mrca tips: A/cattle/CA/24-034698-001-original/2024 and A/cattle/CA/24-037190-002-original/2024
```

```json
{
  "mrca": [
    "A/cattle/CA/24-034698-001-original/2024",
    "A/cattle/CA/24-037190-002-original/2024"
  ],
  "tips": 31,
  "mark": "collapse"
}
```

[![](../media/influenza_surveillance_figure-collapse.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1700%2C%22treeAreaWidth%22%3A430%2C%22colWidth%22%3A0.35%2C%22rowHeight%22%3A8%2C%22drawLabels%22%3Afalse%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22branch%22%2C%22field%22%3A%22state%22%7D%5D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22host%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22Avian%22%2C%22Cattle%22%2C%22Human%22%2C%22Nonhuman%20Mammal%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%238c6d31%22%2C%22%23e15759%22%2C%22%23b07aa1%22%5D%7D%7D%7D%2C%22width%22%3A12%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB2%20670%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB1%20517%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PA%20432%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22HA%20147%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NP%20119%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NA%2071%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22M1%2082%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NS1%2067%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%5D%2C%22clades%22%3A%5B%7B%22mrca%22%3A%5B%22A%2Fcattle%2FCA%2F24-027807-002-original%2F2024%22%2C%22A%2Fchicken%2FCA%2F24-031285-004-original%2F2024%22%5D%2C%22tips%22%3A138%2C%22mark%22%3A%22highlight%22%2C%22color%22%3A%22%23ffd54f%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fcattle%2FCA%2F24-027807-002-original%2F2024%22%2C%22A%2Fchicken%2FCA%2F24-031285-004-original%2F2024%22%5D%2C%22tips%22%3A138%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%23a16207%22%2C%22label%22%3A%22NP%20119V%2C%20138%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fchicken%2FCA%2F24-031667-001-original%2F2024%22%2C%22A%2Fcattle%2FCA%2F24-037821-002-original%2F2024%22%5D%2C%22tips%22%3A38%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%23c2410c%22%2C%22label%22%3A%22California%2C%2038%22%7D%2C%7B%22range%22%3A%5B%22A%2Fcattle%2FID%2F25-012902-006-original%2F2025%22%2C%22A%2Fcattle%2FID%2F26G09268-001-original%2F2026%22%5D%2C%22tips%22%3A17%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%231d4ed8%22%2C%22label%22%3A%22Idaho%2C%2017%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fcattle%2FCA%2F24-034698-001-original%2F2024%22%2C%22A%2Fcattle%2FCA%2F24-037190-002-original%2F2024%22%5D%2C%22tips%22%3A31%2C%22mark%22%3A%22collapse%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-ha.fa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-rowdata.json%22%7D%7D%7D)

The step 6 figure with the 31 rows folded into a triangle labeled 31 at the
bottom of the amber rectangle, which shortens the NP 119V bar by 31 rows.

## 8. Focus a subtree under the overview band

`showTreeOverview` draws the whole tree in a band above the tree panel and boxes
the rows in view. A `focus` mark seeds the view with one subtree, so the
alignment shows 138 of the 204 rows:

```json
{
  "mrca": [
    "A/cattle/CA/24-027807-002-original/2024",
    "A/chicken/CA/24-031285-004-original/2024"
  ],
  "tips": 138,
  "mark": "focus"
}
```

[![](../media/influenza_surveillance_figure-overview.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1300%2C%22treeAreaWidth%22%3A620%2C%22colWidth%22%3A0.35%2C%22rowHeight%22%3A12%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22showTreeOverview%22%3Atrue%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22state%22%7D%2C%7B%22channel%22%3A%22branch%22%2C%22field%22%3A%22state%22%7D%5D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22host%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22Avian%22%2C%22Cattle%22%2C%22Human%22%2C%22Nonhuman%20Mammal%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%238c6d31%22%2C%22%23e15759%22%2C%22%23b07aa1%22%5D%7D%7D%7D%2C%22width%22%3A12%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB2%20670%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB1%20517%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PA%20432%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22HA%20147%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NP%20119%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NA%2071%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22M1%2082%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NS1%2067%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%5D%2C%22clades%22%3A%5B%7B%22mrca%22%3A%5B%22A%2Fchicken%2FCA%2F24-031667-001-original%2F2024%22%2C%22A%2Fcattle%2FCA%2F24-037821-002-original%2F2024%22%5D%2C%22tips%22%3A38%2C%22mark%22%3A%22highlight%22%2C%22color%22%3A%22%23ffd54f%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fchicken%2FCA%2F24-031667-001-original%2F2024%22%2C%22A%2Fcattle%2FCA%2F24-037821-002-original%2F2024%22%5D%2C%22tips%22%3A38%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%23c2410c%22%2C%22label%22%3A%22California%2C%2038%22%7D%2C%7B%22range%22%3A%5B%22A%2Fcattle%2FID%2F25-012902-006-original%2F2025%22%2C%22A%2Fcattle%2FID%2F26G09268-001-original%2F2026%22%5D%2C%22tips%22%3A17%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%231d4ed8%22%2C%22label%22%3A%22Idaho%2C%2017%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fcattle%2FCA%2F24-034698-001-original%2F2024%22%2C%22A%2Fcattle%2FCA%2F24-037190-002-original%2F2024%22%5D%2C%22tips%22%3A31%2C%22mark%22%3A%22collapse%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fcattle%2FCA%2F24-027807-002-original%2F2024%22%2C%22A%2Fchicken%2FCA%2F24-031285-004-original%2F2024%22%5D%2C%22tips%22%3A138%2C%22mark%22%3A%22focus%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-ha.fa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-rowdata.json%22%7D%7D%7D)

In the finished figure, the band across the top holds the whole 204-tip tree
with the California and Idaho rows marked and the focused subtree boxed. Below
it sit the 138 focused rows, the nine strips, the two bars and the collapsed
clade.

## 9. Open the figure and check one row against the build

<!-- usage: web -->

Every layer above is a property of the view, so the whole figure travels in one
link. **Export SVG** in the file menu writes it as vector graphics.

[![](../media/influenza_surveillance_figure-export.png)](https://gmod.org/JBrowseMSA/demo/#data=%7B%22msaview%22%3A%7B%22type%22%3A%22MsaView%22%2C%22height%22%3A1300%2C%22treeAreaWidth%22%3A620%2C%22colWidth%22%3A0.35%2C%22rowHeight%22%3A12%2C%22drawLabels%22%3Atrue%2C%22residueColor%22%3A%7B%22scale%22%3A%7B%22scheme%22%3A%22nucleotide%22%7D%7D%2C%22showTreeOverview%22%3Atrue%2C%22encodings%22%3A%5B%7B%22channel%22%3A%22tipLabel%22%2C%22field%22%3A%22state%22%7D%2C%7B%22channel%22%3A%22branch%22%2C%22field%22%3A%22state%22%7D%5D%2C%22rowPanels%22%3A%5B%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22host%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22Avian%22%2C%22Cattle%22%2C%22Human%22%2C%22Nonhuman%20Mammal%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%238c6d31%22%2C%22%23e15759%22%2C%22%23b07aa1%22%5D%7D%7D%7D%2C%22width%22%3A12%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB2%20670%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PB1%20517%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22PA%20432%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22HA%20147%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NP%20119%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NA%2071%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22M1%2082%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%2C%7B%22kind%22%3A%22strip%22%2C%22encoding%22%3A%7B%22fill%22%3A%7B%22field%22%3A%22NS1%2067%22%2C%22scale%22%3A%7B%22domain%22%3A%5B%22G%22%2C%22I%22%2C%22K%22%2C%22M%22%2C%22N%22%2C%22R%22%2C%22S%22%2C%22T%22%2C%22V%22%2C%22X%22%5D%2C%22range%22%3A%5B%22%234e79a7%22%2C%22%23f28e2b%22%2C%22%23e15759%22%2C%22%2376b7b2%22%2C%22%2359a14f%22%2C%22%23edc948%22%2C%22%23b07aa1%22%2C%22%23ff9da7%22%2C%22%239c755f%22%2C%22%23bab0ac%22%5D%7D%2C%22legend%22%3A%7B%22title%22%3A%22amino%20acid%22%7D%7D%7D%2C%22width%22%3A11%7D%5D%2C%22clades%22%3A%5B%7B%22mrca%22%3A%5B%22A%2Fchicken%2FCA%2F24-031667-001-original%2F2024%22%2C%22A%2Fcattle%2FCA%2F24-037821-002-original%2F2024%22%5D%2C%22tips%22%3A38%2C%22mark%22%3A%22highlight%22%2C%22color%22%3A%22%23ffd54f%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fchicken%2FCA%2F24-031667-001-original%2F2024%22%2C%22A%2Fcattle%2FCA%2F24-037821-002-original%2F2024%22%5D%2C%22tips%22%3A38%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%23c2410c%22%2C%22label%22%3A%22California%2C%2038%22%7D%2C%7B%22range%22%3A%5B%22A%2Fcattle%2FID%2F25-012902-006-original%2F2025%22%2C%22A%2Fcattle%2FID%2F26G09268-001-original%2F2026%22%5D%2C%22tips%22%3A17%2C%22mark%22%3A%22bracket%22%2C%22color%22%3A%22%231d4ed8%22%2C%22label%22%3A%22Idaho%2C%2017%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fcattle%2FCA%2F24-034698-001-original%2F2024%22%2C%22A%2Fcattle%2FCA%2F24-037190-002-original%2F2024%22%5D%2C%22tips%22%3A31%2C%22mark%22%3A%22collapse%22%7D%2C%7B%22mrca%22%3A%5B%22A%2Fcattle%2FCA%2F24-027807-002-original%2F2024%22%2C%22A%2Fchicken%2FCA%2F24-031285-004-original%2F2024%22%5D%2C%22tips%22%3A138%2C%22mark%22%3A%22focus%22%7D%5D%2C%22msaFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-ha.fa%22%7D%2C%22treeFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1.nwk%22%7D%2C%22treeMetadataFilehandle%22%3A%7B%22uri%22%3A%22data%2Fh5n1%2Fh5n1-rowdata.json%22%7D%7D%7D)

The export dialog over the finished figure, set to the current viewport with the
minimap and the tracks checked.

<!-- usage: r -->

[ggmsaview](https://github.com/GMOD/ggmsaview) builds the same figure from the
three hosted files, one `+` per layer:

```r
library(ggmsaview)
data <- "https://gmod.org/JBrowseMSA/demo/data/h5n1/"
rows <- jsonlite::fromJSON(paste0(data, "h5n1-rowdata.json"))
host <- c(Avian = "#4e79a7", Cattle = "#8c6d31", Human = "#e15759",
  "Nonhuman Mammal" = "#b07aa1")
amino <- c(G = "#4e79a7", I = "#f28e2b", K = "#e15759", M = "#76b7b2",
  N = "#59a14f", R = "#edc948", S = "#b07aa1", T = "#ff9da7", V = "#9c755f",
  X = "#bab0ac")
sites <- c("PB2 670", "PB1 517", "PA 432", "HA 147", "NP 119", "NA 71",
  "M1 82", "NS1 67")
california <- c("A/chicken/CA/24-031667-001-original/2024",
  "A/cattle/CA/24-037821-002-original/2024")

w <- msaview(msa = paste0(data, "h5n1-ha.fa"),
    tree = paste0(data, "h5n1.nwk"), residue_color = "nucleotide") +
  geom_msa_rowdata(rows) +
  scale_row_color("state", channel = "tipLabel") +
  scale_row_color("state", channel = "branch") +
  geom_msa_strip("host", range = host)
for (site in sites) {
  w <- w + geom_msa_strip(site, range = amino, title = "amino acid")
}
w <- w +
  geom_msa_clade(mrca = california, tips = 38, color = "#ffd54f") +
  geom_msa_clade(mrca = california, tips = 38, mark = "bracket",
    color = "#c2410c", label = "California, 38") +
  geom_msa_clade(range = c("A/cattle/ID/25-012902-006-original/2025",
      "A/cattle/ID/26G09268-001-original/2026"), tips = 17,
    mark = "bracket", color = "#1d4ed8", label = "Idaho, 17") +
  geom_msa_clade(mrca = c("A/cattle/CA/24-034698-001-original/2024",
      "A/cattle/CA/24-037190-002-original/2024"), tips = 31,
    mark = "collapse") +
  geom_msa_clade(mrca = c("A/cattle/CA/24-027807-002-original/2024",
      "A/chicken/CA/24-031285-004-original/2024"), tips = 138,
    mark = "focus")
w
ggplot2::ggsave("influenza_surveillance_figure-r.png", msaview_plot(w),
  width = 14, height = 14)
```

![](../media/influenza_surveillance_figure-r.png)

The ggplot2 figure shows the 138-tip focus with the 31-tip clade collapsed to a
grey wedge, the nine strips under one key for the eight sites, the amber
California clade and the two brackets.

<!-- /usage -->

The script ends by printing the sample's most recent human case beside the
build's record for it:

```
check tip: A/California/227/2024, display row 49
  node_attrs: {"genbank_accession": {"value": "PX279438"}, "genoflu": {"value": "B3.13"}, "host": {"value": "Human"}, "division_metadata": {"value": "California"}, "num_date": {"value": 2024.958, "confidence": [2024.958, 2024.958], "inferred": false}, "cleavage_site_sequence": {"value": "RRKR"}}
  row: {"genotype": "B3.13", "host": "Human", "state": "California", "year": "2024", "cleavage site": "RRKR", "PB2 670": "R", "PB1 517": "I", "PA 432": "I", "HA 147": "M", "NP 119": "V", "NA 71": "S", "M1 82": "N", "NS1 67": "G"}
  PB2 670: R (root K)
  PB1 517: I (root I)
  PA 432: I (root V)
  HA 147: M (root V)
  NP 119: V (root I)
  NA 71: S (root N)
  M1 82: N (root S)
  NS1 67: G (root R)
```

Display row 49 sits inside the amber NP 119V rectangle, and its host strip is
the red of Human. Seven of its eight segment sites differ from the root state.
The one that matches, PB1 517 I, is the site where only 9 of the 204 tips have
the minor state.

## Reproduce it end to end

[`build_influenza_surveillance_figure.py`](https://github.com/GMOD/JBrowseMSA/blob/main/docs/tutorials/scripts/build_influenza_surveillance_figure.py)
runs every step of this page in one pass:

1. It fetches the pinned build and reconstructs every tip from the root sequence
   and the mutations on each path.
2. It samples every 24th tip with a GenBank accession and a collecting state,
   and picks one variable amino-acid site per segment.
3. It writes the row table, the HA alignment and the build's tree pruned to the
   sample.
4. It prints how far each field follows the tree, the groups to mark, the clade
   to collapse and one tip read against the build.

It needs the tools under [Prerequisites](#prerequisites).

```bash
curl -O https://raw.githubusercontent.com/GMOD/JBrowseMSA/main/docs/tutorials/scripts/build_influenza_surveillance_figure.py
python3 build_influenza_surveillance_figure.py .
```

The argument is the directory to work in.

## See also

- [An RSV phylogeny from a public Nextstrain build](https://gmod.org/JBrowseMSA/tutorials/phylogeny_at_scale)
- [Data layers](https://gmod.org/JBrowseMSA/layers)
- [User guide](https://gmod.org/JBrowseMSA/guide)

## References

- Hadfield J, Megill C, Bell SM, et al. Nextstrain: real-time tracking of
  pathogen evolution. _Bioinformatics_ 34:4121-4123.
- Minh BQ, Schmidt HA, Chernomor O, et al. IQ-TREE 2: new models and efficient
  methods for phylogenetic inference in the genomic era. _Mol Biol Evol_
  37:1530-1534.
- Yu G, Smith DK, Zhu H, Guan Y, Lam TT. ggtree: an R package for visualization
  and annotation of phylogenetic trees with their covariates and other
  associated data. _Methods Ecol Evol_ 8:28-36.
