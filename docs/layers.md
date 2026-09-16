# Data layers

Every field below is a property of the `MsaView` model, so a host can write it
into the standalone app's `?data=` URL, pass it to `MSAModelF().create`, set it
through `MSAViewer` props, or give it to the R widget. The viewer draws each
layer as given, keeps it in a shared URL, and includes it in the SVG export.
Wherever a layer names a row, positions are that row's residues, 1-based and
inclusive, as in GFF, and the viewer projects them through the alignment's gaps.
Without a row, positions are alignment columns.

Every example below is an `MsaView` snapshot. To open one in the standalone app,
URL-encode the JSON and put it in `?data=`, either bare or wrapped as
`{"msaview": {...}}`, the form the app writes back to the address bar:

```js
const snapshot = {
  type: 'MsaView',
  data: { msa: '>human\nMKAANSE\n>mouse\nMKA-NSE' },
}
const url = `https://gmod.org/JBrowseMSA/demo/?data=${encodeURIComponent(JSON.stringify(snapshot))}`
```

The [user guide](https://gmod.org/JBrowseMSA/guide#link-to-a-view) covers what
else a link needs: file URIs, CORS, and the size limit on inline data.

## columnTracks

A track above the alignment, supplied as data. `kind: "bar"` draws one bar per
column from `values`, scaled by `max` (default 1) and clamped to that range.
`kind: "text"` draws one character per column from `data`, colored by `colors`.
`kind: "arc"` joins pairs of positions from `arcs`, drawing each `{start, end}`
as a curve whose height grows with the distance between its ends. `row` makes
`values`, `data` or the ends of an arc index that row's residues instead of
columns, so the first value is residue 1 and the viewer fills in the row's gaps.
A data track appears in the Tracks menu, toggles like any other, and exports to
SVG.

```json
{
  "type": "MsaView",
  "data": { "msa": ">human\nMKAANSE\n>mouse\nMKA-NSE" },
  "columnTracks": [
    {
      "id": "dnds",
      "name": "dN/dS",
      "kind": "bar",
      "values": [0.1, 0.4, 1.8, 0.2, 0.3, 0.1],
      "max": 2,
      "color": "#6a51a3",
      "row": "human"
    },
    {
      "id": "frame",
      "name": "Codon frame",
      "kind": "text",
      "data": "1231231",
      "colors": { "1": "#ddd", "2": "#bbb", "3": "#999" }
    },
    {
      "id": "disulfides",
      "name": "Disulfide bonds",
      "kind": "arc",
      "arcs": [
        { "start": 31, "end": 96 },
        { "start": 43, "end": 109 }
      ],
      "color": "#b8860b",
      "row": "human"
    }
  ]
}
```

| Field    | Kind | Meaning                                                             |
| -------- | ---- | ------------------------------------------------------------------- |
| `id`     | both | Unique key. The Tracks menu and `turnedOffTracks` use it            |
| `name`   | both | Label beside the track                                              |
| `values` | bar  | One number per column, or per residue of `row`                      |
| `max`    | bar  | Value drawn at full height (default 1)                              |
| `color`  | bar  | Bar fill (default gray)                                             |
| `data`   | text | One character per column, or per residue of `row`                   |
| `colors` | text | Character to background color; the active color scheme otherwise    |
| `arcs`   | arc  | `{start, end, color?}` pairs; each end is a column or a residue     |
| `row`    | both | Row name whose residues the values or characters index              |
| `height` | both | Pixel height (default: the conservation track's, or the row height) |

An arc joins two positions, such as a base pair, a disulfide bond or a residue
contact; bar and text tracks hold one value per position. Both ends of an arc
are alignment columns, or residues of `row`, so a contact map computed in a
protein's own numbering lands on the alignment without conversion. The viewer
draws arcs on one baseline in the order given. A `color` on an individual arc
overrides the track's, so one track can separate classes of pair, such as nested
helices and a pseudoknot.

An RNA Stockholm file needs no arc track, because `#=GC SS_cons` already pairs
the columns. The viewer draws a **Base pairs** track from it and gives
pseudoknot pairs their own color. WUSS writes a pseudoknot pair as `A`/`a`
because it crosses a helix, and brackets can only nest.

Track values can come from outside the alignment. The p53 example carries a
per-residue count of the missense variants ClinVar classifies as pathogenic. The
producer computes that count wherever the ClinVar data lives, and the viewer
places it on the matching columns.

A track over 50 kB serialized stays in the live model but leaves the snapshot,
under the same [size rule](https://gmod.org/JBrowseMSA/guide#link-to-a-view)
that applies to inline alignments. Keep a track under that size, or host the
values and set them at runtime with `model.setColumnTracks(...)`.

A `?data=` link has a tighter limit, set by the server in front of gmod.org: it
answers a request line over 8,192 characters with a 414 error instead of the
page. The request line is the whole `GET /JBrowseMSA/demo/?data=… HTTP/1.1`,
URL-encoded snapshot included, so three tracks of a few hundred values fit and
much more does not. Scale the values to integers and record the scale in `max`:
`87,` takes three characters and `0.87,` takes five.

## highlights

A labeled band over a column range or a residue range, or a tint over a set of
rows. `label` and `color` are optional; `color` is any CSS color and paints the
band, its border, or the row tint.

```json
"highlights": [
  { "row": "human", "start": 248, "end": 248, "label": "R248Q · 651/658 R" },
  { "start": 40, "end": 60, "label": "NES", "color": "rgba(0,120,255,0.25)" },
  { "rows": ["beluga", "dolphin"], "label": "frameshift carriers" }
]
```

`row` plus `start`/`end` is a residue range of that row. Without `row` the range
is alignment columns, also 1-based. `rows` marks whole rows across the tree
labels and the alignment, with the label in the tree gutter. A range that lands
entirely on hidden gappy columns draws nothing; one that straddles them shrinks
to the visible part. The viewer ignores row names that match no row.

React: the `highlights` prop on `MSAViewer`, or `model.setHighlights(list)`. R:
`msaview(highlights = list(list(row = "human", start = 248, end = 248)))`.

For a transient highlight, such as one following a hover in a structure viewer
or a genome browser, call `model.applyHighlight(owner, list)` and
`model.clearHighlight(owner)`. They take the same shape, draw over the persisted
highlights, and stay out of the snapshot. `clearHighlight(owner)` removes only
that owner's highlights, so two sources can highlight at once.

## clades

A clade of the tree with a mark over it. `mark` takes one of four values:

- `highlight` fills the rows behind the clade with a translucent rectangle,
  running from the clade's common ancestor to the right edge of the tree area
  and on across the alignment, which is ggtree's `geom_hilight`.
- `bracket` draws a vertical bar beside the clade's rows carrying the record's
  `label`, which is ggtree's `geom_cladelab` and, over a `range`, `geom_strip`.
- `collapse` collapses the clade at load, the way the branch menu's "Collapse
  this node" does.
- `focus` opens the viewer on the clade alone, the way "Show only this node"
  does.

```json
"clades": [
  {
    "mrca": ["Gs/TW/TNC1/2015", "Ck/TW/a174/2015"],
    "tips": 47,
    "mark": "highlight",
    "color": "#fff3c4",
    "label": "2.3.4.4 H5Nx"
  },
  { "range": ["Dk/VN/1/2012", "Ck/VN/14/2012"], "tips": 6, "mark": "highlight" }
]
```

`mrca` names tips whose most recent common ancestor is the clade, and the mark
covers every tip under that ancestor. Two names are enough for a clade of any
size, and a name the tree does not have, or has twice, drops the record: a
duplicated tip name cannot say which tip it means.

`tips` is the leaf count the producer measured. The viewer resolves the ancestor
and counts the leaves under it, and a count that differs drops the clade. A
re-rooted or re-estimated tree therefore loses the rectangle instead of drawing
it over a different clade, the way `residueMappings.rowLength` guards a mapping
against a re-aligned row.

`range` takes the two ends of a run of tips in display order, in either order,
and covers every tip between them, monophyletic or not. Its `tips` is checked
the same way, against the length of the run.

`color` is any CSS color, defaulting to a light yellow. A highlight's color
carrying no alpha of its own draws at 60% opacity, so the branches and the
residues under it stay readable. A bracket draws its bar and its label in that
color at full strength, and takes the theme's text color without one.

The bracket mark takes a gutter at the right of the tree area, between the tip
labels and the first row panel or the alignment. The gutter is as wide as the
bar plus the widest label at the tree font, to a limit of 140px, past which a
label is cut with an ellipsis. A label reads across the rows where they are
taller than the font, and runs up the bar where they are not. A `highlight`
record carrying a `label` draws the label the same way, with no bar.

`collapse` and `focus` seed the viewer's own `collapsed` list and `showOnly`
once, when the tree resolves. A collapsed clade therefore draws as a triangle
with its tip count, and `hideGaps` counts the rows that remain, exactly as when
the user collapses it by hand. Both marks name a node, so they need `mrca`: a
`range` record carrying one of them drops, along with the records the checks
above drop. Expanding a seeded clade or clearing the focus holds for the rest of
the session, and the record collapses or focuses again the next time the link is
opened.

```json
"clades": [
  {
    "mrca": ["Gs/TW/TNC1/2015", "Ck/TW/a174/2015"],
    "tips": 47,
    "mark": "bracket",
    "color": "#b45309",
    "label": "2.3.4.4 H5Nx"
  },
  { "mrca": ["Dk/VN/1/2012", "Ck/VN/14/2012"], "tips": 6, "mark": "collapse" }
]
```

The tips resolve against the tree as loaded, so collapsing a clade's ancestor or
focusing on part of the tree keeps the mark on the rows that remain on screen.

React: the `clades` prop on `MSAViewer`, or `model.setClades(list)`. R:
`geom_msa_clade(c("Gs/TW/TNC1/2015", "Ck/TW/a174/2015"), tips = 47)`.

## rowData

A table of fields per row, keyed by row name: a lineage, a host, a collection
date, a kinase group. The `encodings` below color the viewer's marks by one of
these fields, the tree's node-info dialog lists a row's fields, and a `genome`
field replaces the row name in the tree labels.

The model keeps the table as the JSON string `data.treeMetadata`, the field name
that travels in existing links, so a snapshot carries it there:

```json
{
  "type": "MsaView",
  "data": {
    "msa": ">duck\nMKAANSE\n>chicken\nMKA-NSE",
    "treeMetadata": "{\"duck\":{\"clade\":\"2.3.4.4b\"},\"chicken\":{\"clade\":\"2.3.2.1c\"}}"
  }
}
```

Everywhere else the table is an object: the `rowData` prop on `MSAViewer`,
`model.setRowData(table)`, `geom_msa_rowdata(df)` in R, and the `row_data` trait
in Python. R takes a data frame whose `label` or `row` column names each row and
whose other columns are the fields, the shape a ggtree
`tibble(label = , trait = )` has.

A real metadata table needs the filehandle. Five thousand rows with eight fields
run to roughly 700 kB, fourteen times the 50 kB inline limit and far past the
8,192-character request line a `?data=` link fits in, so the snapshot drops it
and `unshareableData` reports the drop. Host the JSON and set
`treeMetadataFilehandle` to its URL, and the viewer fetches the table at
startup:

```json
{
  "type": "MsaView",
  "msaFilehandle": { "uri": "https://example.org/h5.fa" },
  "treeMetadataFilehandle": { "uri": "https://example.org/h5-lineages.json" }
}
```

## encodings

What the viewer's own marks read from a table. Each entry names a `channel`, the
`field` feeding it, and the `scale` that turns a field value into a color. The
`tipLabel` channel colors each tip label in the tree, `rowTint` washes the whole
row across the tree gutter and the alignment, and `branch` colors a tree edge
whose tips all share one value, each from a field of `rowData`. The
`featureFill` channel colors each span of the annotation overlay and
`featureLabel` names the field drawn inside a span, both from a field of the
features `gff` carries.

```json
{
  "type": "MsaView",
  "data": { "msa": ">duck\nMKAANSE\n>chicken\nMKA-NSE" },
  "encodings": [
    { "channel": "tipLabel", "field": "clade", "scale": { "palette": "set1" } },
    {
      "channel": "rowTint",
      "field": "clade",
      "scale": { "map": { "2.3.4.4b": "#e41a1c" } }
    }
  ]
}
```

| Field     | Meaning                                                            |
| --------- | ------------------------------------------------------------------ |
| `channel` | `tipLabel`, `rowTint`, `branch`, `featureFill` or `featureLabel`   |
| `field`   | the field the channel reads                                        |
| `scale`   | `{palette}` or `{map}`; the ggplot palette when the entry omits it |

A `{palette}` names one of `ggplot` (the default), `set1`, `dark2`, `okabeito`
and `tableau`, and the scale hands its colors to the field's distinct values in
sorted order, so a value keeps its color as rows are collapsed, filtered or
re-ordered. Past the end of a palette every value takes an evenly spaced hue
instead, which keeps a forty-clade field readable. A `{map}` names a color per
value, and a value it leaves out keeps the plain mark: an uncolored tip label
draws in the theme's text color and an uncolored row takes no tint.

A tint draws at 25% opacity so the residues under it stay readable. A color
carrying its own alpha, such as `rgba(228,26,28,0.5)`, draws at that alpha.

The `branch` channel gives an internal node the field's value when every tip
below it shares that value, and the edge from that node to its parent draws in
the scale's color for the value, as does every edge inside the clade. An edge
whose tips disagree draws in the default color, and a collapsed clade's triangle
takes the color of the value its tips agree on. This is ggtree's `groupClade`
followed by `aes(color = group)`, with the group read from the table.

Every field an encoding reads carries a legend of its scale, titled by the field
name, drawn by the overlay on screen and reserved as a column in the SVG export.
Two channels over one field list that field once.

The scales resolve once per change of the table or the encodings, and the tint
draws in the overlay the `highlights` row sets use, which keeps it out of the
alignment's raster tile cache.

A feature channel reads any field of the feature table: `accession`, `name`,
`featureType`, or any GFF attribute of column 9, such as `Name` or `gene`. The
`featureFill` scale replaces the accession palette the overlay colors spans by,
and the domain legend lists that scale's values under the field's name. A
feature carrying a GFF3 `color=` attribute keeps that color whatever the scale
says, and `255,0,0` reads as `rgb(255,0,0)`, the convention JBrowse and IGV
honor. A `featureLabel` draws inside its span wherever the text fits, and it is
a data channel, so it draws whether or not the residue letters do.

```json
{
  "type": "MsaView",
  "data": {
    "msa": ">duck\nMKAANSE\n>chicken\nMKA-NSE",
    "gff": "##gff-version 3\nduck\tncbi\tgene\t1\t5\t.\t+\t.\tName=HA;class=surface\nchicken\tncbi\tgene\t1\t4\t.\t+\t.\tName=NP;class=internal;color=255,0,0"
  },
  "encodings": [
    {
      "channel": "featureFill",
      "field": "class",
      "scale": { "palette": "set1" }
    },
    { "channel": "featureLabel", "field": "Name" }
  ]
}
```

## rowPanels

A column of colored cells beside the tree, one cell per alignment row. Each
record names a `kind`, and `strip` is the one kind today: it reads a field of
`rowData` and colors each row's cell through `scale`. Eight strips make the
tip-aligned matrix ggtree draws with `gheatmap`.

```json
{
  "type": "MsaView",
  "data": {
    "msa": ">duck\nMKAANSE\n>chicken\nMKA-NSE",
    "treeMetadata": "{\"duck\":{\"HA\":\"H5\",\"NA\":\"N1\"},\"chicken\":{\"HA\":\"H5\",\"NA\":\"N8\"}}"
  },
  "rowPanels": [
    {
      "kind": "strip",
      "field": "HA",
      "scale": { "palette": "set1" },
      "width": 12
    },
    { "kind": "strip", "field": "NA", "header": "NA segment" }
  ]
}
```

| Field    | Meaning                                                             |
| -------- | ------------------------------------------------------------------- |
| `kind`   | `strip`                                                             |
| `field`  | the `rowData` field the cells read                                  |
| `scale`  | `{palette}` or `{map}`; the ggplot palette when the record omits it |
| `width`  | the column's pixel width, defaulting to the row height              |
| `header` | the name drawn above the column, defaulting to the field            |

The panels sit between the tree and the alignment, and they take their width out
of the alignment's: the alignment scrolls and fits within what is left. A strip
scrolls with the tree and the alignment, and a row the table gives no value
leaves its cell empty.

Each header draws above its column in the band the tree's scale bar and the
minimap share, turned on its side, and it exports with the figure. The band is
as tall as the minimap, so a header longer than that is clipped to it on screen
and in the export, and the full name is the column's tooltip.

A strip's scale carries a legend of its own, titled by the field, and every
strip and encoding over one field lists that field once. So two strips over `HA`
and a `tipLabel` encoding over `HA` produce one legend, and a strip over `NA`
adds a second.

React: the `rowPanels` prop on `MSAViewer`, or `model.setRowPanels(list)`. R:
`geom_msa_strip("HA", palette = "set1", width = 12)`. Python: the `row_panels`
trait.

## residueMappings

A residue mapping records which residue of which structure each residue of a row
corresponds to. Unlike the layers above, `residueMappings` draws nothing; the
model reads it to answer lookups. The host has to supply it, because matching a
row to a structure by sequence equality fails for a construct with an expression
tag, a truncation, an engineered residue, or a row that is a subsequence of the
entry. That failure is hard to spot: the highlight lands on a real residue, just
the wrong one. A producer such as SIFTS, an AlphaFold model or a curator
computes the correspondence.

```json
"residueMappings": [
  {
    "row": "HBA_HUMAN/1-142",
    "accession": "P69905",
    "structure": {
      "id": "1A3N",
      "kind": "experimental",
      "asymId": "A",
      "url": "https://files.rcsb.org/download/1A3N.cif"
    },
    "segments": [
      { "rowStart": 1, "rowEnd": 141, "structStart": 2, "structEnd": 142 }
    ],
    "unobserved": [[60, 62]],
    "rowLength": 142,
    "generated": { "by": "sifts", "date": "2026-09-10" }
  }
]
```

| Field        | Meaning                                                              |
| ------------ | -------------------------------------------------------------------- |
| `row`        | The alignment row this maps                                          |
| `accession`  | The sequence database entry the mapping went through, for provenance |
| `structure`  | `id`, plus optional `kind`, `asymId` (the chain) and `url`           |
| `segments`   | Contiguous runs where the two sides line up 1:1                      |
| `unobserved` | Structure positions declared but not resolved, as `[start, end]`     |
| `rowLength`  | Ungapped length of the row it was computed against; always set it    |
| `generated`  | Who computed it, when, and from what                                 |

Positions are 1-based and inclusive on both sides, as everywhere else in this
document. Structure positions are `label_seq_id`, the index into the entity's
SEQRES. Author numbering carries insertion codes, which break integer
arithmetic, so the layer does not use it.

**Segments, not a per-residue array**: a mapping is a few contiguous runs, and a
dozen numbers describe what a dense array spends kilobytes on. The segments also
define what is unmapped: **a position no segment covers is unmapped**, so the
layer needs no status field that could contradict them. A position is in one of
three states:

- covered by a segment and not in `unobserved`: mapped and observed
- covered and listed in `unobserved`: mapped, not observed
- anything else: unmapped

The middle state separates "the crystallographer could not see this residue"
from "this protein has no such residue".

Two model methods read it:

```ts
model.structureResidue(rowName, seqPos, structureId?) // -> {structure, position, observed} | undefined
model.rowResidue(structureId, position, asymId?) // -> {rowName, seqPos} | undefined
```

Both return `undefined` when no mapping covers the position, **and also when
more than one does**. A row commonly maps onto several structures, such as an
experimental entry and a couple of predicted models, and a homodimer maps two
rows onto two chains of one id. Returning the first mapping found would give a
wrong residue with no sign of the error. Name one structure or chain with the
optional argument, or read `mappedStructures` to see what is available.

### Staleness

A host can load a saved mapping against a re-aligned, revised or different
sequence, and every lookup would then return a wrong residue with no error.
Before answering, the viewer checks each mapping and stops using it when any of
these holds:

- The row it names is not in the alignment.
- `rowLength` is declared and does not match the row's ungapped length. No other
  check catches a same-length substitution, so a producer should always set it.
- A segment covers residues past the end of the row, which shows the same
  mismatch when `rowLength` is missing.

When a segment is malformed, its two sides differing in length so it cannot be a
1:1 run, the viewer drops only that segment and keeps using the rest of the
mapping.

`packages/examples/src/examples/kinaseStructure.json` is a real mapping,
generated by `scripts/examples-gen/contacts.mjs` from SIFTS: the SRC_HUMAN row
against chain A of 2SRC, one segment putting row residue 86 at structure residue
2, one unobserved range, and `rowLength: 536`. The
[spike_structure tutorial](https://gmod.org/JBrowseMSA/tutorials/spike_structure)
builds another from scratch, against a construct whose numbering is offset by 19
and whose furin loop has no coordinates at all. `hemoglobinSickle.json` is the
smallest example: the sickle-cell substitution is residue 7 of the row and
residue 6 of PDB 1A3N chain B, and the mapping converts between the two.

`model.residueMappingProblems` lists each mapping or segment the viewer dropped,
with a `scope` (`mapping` or `segment`) and a reason, so a host can tell "there
is no structure for this row" from "this data no longer matches what is loaded".
`model.usableResidueMappings` holds the mappings that passed.

`seqPos` is 1-based, like the rest of this document, and composes directly with
`applyHighlight`. The column helpers on the model (`seqPosToVisibleCol`) take
0-based positions, so a structure hover reaches a column as
`model.seqPosToVisibleCol(rowName, seqPos - 1)`.
