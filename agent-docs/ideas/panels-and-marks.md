# Panels and marks

react-msaview has two scales. The row scale is the set of tips, ordered by the
tree. The column scale is the alignment. Every component is a panel bound to one
of them: the tree, the alignment and the planned strips share rows, and the
tracks and the ruler share columns. The alignment is the one panel on both
scales. Naming this lets the viewer draw the figures ggtree, gggenes and a
surveillance paper's tip-aligned matrix draw today, from data an agent pushes
into the snapshot, in the vocabulary jbrowse-components uses for
`LinearMarkDisplay`.

Two target figures, in order of work:

- **H5 surveillance figure.** A phylogram with support values on internal nodes,
  tip labels colored by lineage, translucent rectangles behind named clades with
  labeled brackets, an inset overview of the full tree with the focused clade
  boxed, and a tip-aligned categorical matrix of eight segment lineages with a
  legend.
- **Gene neighborhoods.** A tree beside one row of strand arrows per genome,
  each arrow labeled and filled by gene name, with a legend and no alignment.

## Vocabulary

- **Panel.** A component that owns one scale and shares the other. Adding one
  changes layout, the width bookkeeping in `msaAreaWidth`, and the clip groups
  in `renderToSvg.tsx`. ggtree uses the word the same way: `facet_plot(panel=)`
  and `geom_facet` add a named panel sharing the tree's y, and `msaplot` and
  `gheatmap` are two such panels.
- **Mark.** What a panel draws: a span, a bar, a glyph, a label, a tint. Adding
  one is a draw function.
- **Channel.** A visual property of a mark that a field feeds: `color`, `label`,
  `glyph`, `x`, `x2`.
- **Scale.** How a channel reads a field: a categorical scale with a palette or
  an explicit map, later a linear one. A categorical scale produces a legend.
- **Transform.** A change of coordinates before drawing. The viewer has one
  today, the projection of residue positions through gaps, and gains one more,
  `align`.
- **Position.** How marks that would land on top of each other share the room
  instead. ggplot2 spells its adjustments `position_identity`, `position_stack`
  and so on, and gggenomes adds `position_strandpile`; a `features` panel's
  `position` takes the same names. A position moves a mark, it never redraws
  one, which is why `strandpile` is lane arithmetic and touches no renderer.

"Layer" stays out of the public vocabulary. In ggplot a layer is data plus geom
plus stat in one coordinate space, and ggtree adds panels with `facet_plot`. In
a linked multi-panel viewer the word covers both a panel and a mark, and the two
cost different things to add. `docs/layers.md` keeps its filename, and the R `+`
composition in `layers.R` stays, since ggtree users expect it.

## The general layout

ComplexHeatmap states the layout this viewer has: a body, and on each side of it
a list of marginal annotations, each one a mark over the axis it shares with the
body. The alignment is the body. `columnTracks` are the annotations above it and
`rowPanels` the annotations left of it, and the tree is the first row panel, the
way a dendrogram is a row annotation there. Vega-Lite spells the same layout as
a concat of views with a shared positional scale.

Everything else is a guide, in Vega's sense: `TreeRuler` is the axis of the
branch-length scale, the position ruler is the axis of the column scale, a
legend is the guide of a color scale, and the minimap and the tree overview are
brushes on the two positional scales. A guide has no data of its own, so it
takes no record in either list.

What the layout gives the API:

- **One kind vocabulary on both axes.** A `bar` of one value per column is a
  `columnTracks` record today. A `bar` of one value per row, such as genome
  size, is a `rowPanels` record reading a `rowData` field. `text` and `strip`
  work the same way, `features` and `arc` index positions along the axis, and
  the record fields match across the two lists: `kind`, `id`, `name`, `scale`,
  `color`, and `height` or `width` for the extent across the shared axis.
- **`side` for the other two sides.** `side: "right"` on a row panel puts it
  past the alignment, where `gheatmap` places its matrix beside the tip labels,
  and `side: "bottom"` on a track puts a ruler or a logo under the alignment.
  Both default to the side they draw on today, so the field costs nothing until
  a figure needs it.
- **Two lists stay two lists.** `columnTracks` is shipped and travels in shared
  URLs, and the track machinery (`turnedOffTracks`, `heightKey`, `trackHeights`,
  `hideGaps`) is column-only. A single `panels` list with an `axis` field would
  deprecate a property to gain a name.

## What the figures need

| Mark                             | ggtree / gggenes                 | react-msaview today                                                  |
| -------------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| Phylogram, scale bar             | `ggtree`                         | `renderTree`, `TreeRuler`                                            |
| Collapsed clade + tip count      | `collapse`                       | `renderCollapsedTriangles`, seeded by `clades` `mark: "collapse"`    |
| Tip labels                       | `geom_tiplab`                    | `renderTreeLabels` (`renderTreeCanvas.ts:287`)                       |
| Tip labels colored by a field    | `aes(color=)`                    | missing; `treeMetadata` holds the data and no channel reads it       |
| Support values on internal nodes | `geom_nodelab`                   | missing; parsed and never drawn                                      |
| Clade highlight rectangle        | `geom_hilight`                   | `clades` with `mark: "highlight"` (`renderTreeCanvas.ts`)            |
| Clade bracket + label            | `geom_cladelab`                  | `clades` with `mark: "bracket"` (`cladeBrackets.ts`)                 |
| Bracket over a run of tips       | `geom_strip`                     | a `bracket` record over `range`                                      |
| Branches colored by a group      | `groupClade`, `aes(color=group)` | missing                                                              |
| Tree overview inset              | `viewClade`, `geom_zoom_clade`   | `showTreeOverview` (`renderTreeOverview.ts`)                         |
| Tip-aligned categorical matrix   | `gheatmap`                       | missing                                                              |
| Legend for a categorical scale   | `scale_*_manual`                 | `AnnotationLegend`, keyed to domain accessions only                  |
| Strand arrow spans per row       | `geom_gene_arrow`                | `drawFeatureSpans.ts`, over columns or over residue positions        |
| Arrow filled by a field, labeled | `aes(fill=)`                     | `featureFill` and `featureLabel`, or a `features` panel's `encoding` |
| Rows aligned on one gene         | `make_alignment_dummies`         | the `align` transform on a `features` panel                          |

## Decisions

### Row panels are an array of records, mirroring `columnTracks`

```json
"rowPanels": [
  { "kind": "strip", "field": "HA", "scale": { "palette": "ggplot" }, "width": 12 },
  { "kind": "strip", "field": "NA", "header": "NA segment" },
  {
    "kind": "features",
    "x": "position",
    "encoding": {
      "color": { "field": "Name", "scale": { "palette": "ggplot" } },
      "label": "Name"
    },
    "transform": [{ "type": "align", "on": "genE" }]
  }
]
```

`columnTracks` is already an array of `{kind}` records on the column scale, and
`rowPanels` is its counterpart on the row scale. Eight `strip` records reproduce
a `gheatmap`, and one `features` record reproduces the gene figure. Each record
carries its own `encoding`, the way each mark in `LinearMarkDisplay` does, so a
panel's channels sit beside the panel they color. A strip's `width` is in pixels
and defaults to the row height, and `header` defaults to the field, covering
`gheatmap`'s `width` and `custom_column_labels`. A strip over a field every row
shares one scale, so eight strips of segment lineages share one legend when they
name the same `scale`.

The top-level `encodings` array covers channels on the marks the viewer always
draws:

```json
"encodings": [
  { "channel": "tipLabel", "field": "lineage", "scale": { "palette": "ggplot" } },
  { "channel": "rowTint", "field": "clade", "scale": { "map": { "19B": "#e41a1c" } } },
  { "channel": "branch", "field": "clade" },
  { "channel": "featureFill", "field": "Name" }
]
```

`tipLabel`, `rowTint` and `branch` read `rowData`. `branch` colors an edge by a
field value when every tip below it shares the value, and leaves the edge in the
default color otherwise, which is `groupClade` followed by `aes(color = group)`
in ggtree, with the group read from the table. `featureFill` reads the feature
table and replaces the accession palette for the domain overlay in the alignment
panel, so a producer can color pathogenic features red.

Both properties are arrays of frozen records with a discriminator, the shape
`columnTracks`, `highlights` and `residueMappings` take. All four wrappers pass
such a property through without enumerating its values, and R reaches every kind
through one function per property. An object keyed by channel or by kind was
declined: `embedApiParity.test.ts` and `test-layer-coverage.R` compare property
names as sets, so a per-key object counts as one name and lets a wrapper expose
`strip`, omit `features`, and keep both tests green.

`data-layers.md` sketches `rowStrips: [{key, colors}]`. `rowPanels` with
`kind: "strip"` is that property under the name the other kinds share.

### One span mark draws domains, genes and color blocks

The domain overlay, the gene arrows in the target figure, and a block of color
over a row range are one mark: a span in row space with `x`, `x2`, `row`,
`color`, `glyph` and `label` channels. They differ in three settings.

- **The x scale.** `column` projects residue positions through the gaps, which
  `domainBands` (`model.ts:2764`) does today with `seqPosToGlobalCol`.
  `position` draws each row in its own coordinates on one shared linear axis, so
  a genome with no alignment has an x. `position` is only valid on a `features`
  row panel, since the alignment panel's x is the column scale.
- **The glyph.** `strand` on an `Annotation` already picks `drawGeneArrow` over
  `fillRect`, and the exon path keys on `featureType`. Neither figure needs a
  new glyph.
- **The fill.** `fillPalette` (`model.ts:2691`) assigns by accession and a
  producer cannot override it. A categorical scale on a chosen field replaces
  it, and a GFF `color=` attribute, which JBrowse and IGV both honor, overrides
  the scale per feature. The legend comes from the scale.

The data is `data.gff`, which already persists, already travels in the shared
URL, and already parses to `Annotation[]` with `id` (the row), `start`, `end`,
`strand`, `featureType` and every GFF attribute. A `features` panel reads the
same `annotationsByRow` the overlay reads. The gene figure stores nothing new;
the CLI writes the GFF and the viewer draws it.

`highlights` with `row`, `start`, `end` and `color` already draws one color
block over the alignment. It lacks a scale, so a thousand blocks cannot share a
legend. A `features` panel over `x: "column"` with the letters hidden covers
that case, and the per-cell color matrix stays declined for the reasons
`data-layers.md` gives.

### The `align` transform

gggenes aligns rows on a chosen gene so that homologous neighborhoods line up.
`{ "type": "align", "on": "genE" }` shifts each row's x so that the first
feature whose `Name` is `genE` starts at zero, and a row with no such feature
keeps its own origin. A getter computes the shift once per panel and the
renderer applies it. No other transform is planned; stats stay outside the
viewer under the rule in `CLAUDE.md`.

### One row table, stored where the size rule already runs

The public property is `rowData`, a map from row name to fields. The model
serializes it into `data.treeMetadata`, the JSON string that exists today, so
the 50 kB inline limit (`model.ts:1048`, `constants.ts:85`), the
`postProcessSnapshot` strip (`model.ts:3350`) and `treeMetadataFilehandle`
(`model.ts:390`, loader at `model.ts:3227`) apply without new code. The snapshot
field keeps the name `data.treeMetadata`, which travels in existing links, the
reason `bgColor` kept its name under `residueEncoding`.

`rowDataOf(name)` becomes the single reader and replaces the three call sites
that read `?.genome` for a display label (`model.ts:1587`,
`renderTreeCanvas.ts:340`, `model.ts:2951`).

No `treeMetadata` property exists on `MSAViewer` (`MSAViewer.tsx:36-104`) and no
`tree_metadata` trait exists in Python. The row table is reachable only through
a snapshot or a filehandle today, so every row channel is blocked until step 3
adds the property.

A 5000-row table with 8 fields runs to roughly 700 kB, over the inline limit by
14x and far over the 8,192-character `?data=` request line (`docs/layers.md`).
The docs say so: a real metadata table needs the filehandle.

### A row tint draws as an overlay

CLAUDE.md requires the raster tile cache to key on every input to a cell's
color. A tint that replaced a cell background would enter `RasterSpec`
(`msaRaster.ts:17`), `rasterKeys` (`msaRaster.ts:295`) and `cellPixelFn`
(`msaRaster.ts:65`), and from there the minimap thumbnail and the `<image>`
export path. The tint draws as an alpha wash in `renderHighlights`, the path
`highlights` with `rows` already takes (`renderHighlights.ts:107`,
`renderTreeCanvas.ts:425`), and the SVG export comes through
`renderPersistentHighlights`.

That path carries two defects a tint over every row would expose, and step 3
fixes both:

- `renderHighlights.ts:108-111` draws every entry of `rowIndices` in every block
  with no visible-row test, and `renderMouseover` redraws on pointer move.
- `renderTreeCanvas.ts:432` is `Math.min(...rowIndices)`. The spread throws
  `RangeError` past about 125k arguments, which `model.ts:1608-1616` already
  works around for the 230k-tip COVID tree.

### A clade is addressed by the MRCA of a tip set plus a tip count

Node ids are path-derived (`msa-parsers/src/util.ts:33`, asserted as
`node-0-1-1-0-2` in `util.test.ts:19`). A re-rooted tree repoints them, and
their length grows with depth, so the 50k-deep caterpillar in `util.test.ts:31`
produces a single id of roughly 200 kB. `model.ts:2389` already clears
`collapsed` on `replaceTree` for the same reason.

```json
"clades": [
  {
    "mrca": ["Gs/TW/TNC1/2015", "Ck/TW/a174/2015"],
    "tips": 47,
    "mark": "highlight",
    "color": "#fff3c4",
    "label": "2.3.4.4 H5Nx"
  }
]
```

`tips` records the leaf count the producer measured. A resolved clade whose
count differs is dropped, which turns a re-rooted tree into a missing rectangle
in place of a rectangle over the wrong clade. `residueMappings.rowLength` guards
the same failure the same way.

Resolution rules:

- Resolve against `get tree()`, never `get root()`. `root` applies `collapsed`
  and `showOnly` (`model.ts:1170-1188`), so a clade whose ancestor the user
  collapsed would disappear.
- Memoize on `data.tree`. Naive MRCA is O(tips) per clade, and N clades per
  render is visible on a large tree. One name-to-path pass serves all of them.
- Duplicate tip names collapse in `rowNamesSet` (`model.ts:1129`, a `Map` where
  the last entry wins), so an MRCA over a duplicated name is ambiguous. Drop
  those clades and list them the way `resolvedHighlights` drops unknown rows
  (`model.ts:2895`).
- A tip set whose MRCA is the root annotates the whole tree. Requiring `tips` to
  match already covers it.

A bracket does not always cover a clade. ggtree's `geom_strip(taxa1, taxa2)`
brackets every tip between two names in display order, monophyletic or not, and
the sublineage brackets beside the H5 matrix are of that kind. A `clades` record
therefore takes `range: ["Gs/TW/TNC1/2015", "Gs/TW/TN013/2015"]` in place of
`mrca`, resolved against the current leaf order, and only `highlight` and
`bracket` accept it. `collapse` and `focus` name a node and need `mrca`.

`geom_hilight` extends its rectangle to a common right edge with `extendto` and
`align = "right"`. The rectangle here always runs to the tree area edge, which
is that setting with no option.

`mark: "collapse"` and `mark: "focus"` seed the existing `collapsed` array and
`showOnly` once in `afterCreate`, the way `highlightColumns` seeds
`highlightedColumns` (`model.ts:3088`). A parallel collapse list would miss
`hideGapsEffective` (`model.ts:940`), `get root()` and
`renderCollapsedTriangles`, all of which read `collapsed`.

### The tree overview is a brush on the row scale

The minimap is a brush on the column domain. The inset in the H5 figure is the
same control on the row domain, and `showOnly` is already that brush: in cluster
layout a subtree is a contiguous range of tips (`xMin`/`xMax` on every node,
`hierarchy.ts:89-93`), so a rectangle on the overview maps to exactly one node,
and a click on the overview sets `showOnly` to the deepest node whose tip range
contains the click.

The overview draws `get tree()` at small scale, never the filtered `root`, so
the focused clade shows inside the whole. It draws the clade rectangles from
step 7 as well, since the inset in the paper shows them. A 230k-branch tree
cannot be redrawn per frame, so the overview renders once to an offscreen canvas
keyed on `data.tree` and `collapsed`, the way `msaRaster.ts` keys its tiles, and
each frame blits it and strokes the `showOnly` box on top.

An earlier draft deferred a two-dimensional column overview because a figure is
an `entire` export and the overview would be chrome absent from the output it
serves. The tree inset is part of the published figure, so it exports as a group
beside the tree panel. On screen it sits in `TopArea` above the tree, where
`TreeRuler` is, with a height of its own.

### Rotated text stays outside the canvas layer

`packages/svgcanvas/src/index.ts` implements `scale`, `translate` and
`setTransform`, and no `rotate`; `RenderCtx` (`components/renderCtx.ts:7-34`)
does not list it either. Strip headers and bracket labels are chrome, so they
draw as DOM text with `writing-mode: vertical-rl` on screen and as React
`<text transform="rotate(-90 …)">` in the export, beside the canvas layer, the
way `TrackLabelsSVG` emits track names (`renderToSvg.tsx:455`). Adding
`rotate()` to svgcanvas is about six lines whenever a renderer call needs it,
since `__applyTransformation` (`index.ts:220`) already emits a matrix.

### Declined

- **Circular, fan and unrooted layouts.** They are the coordinate-system axis of
  the grammar. A shared row scale lines the panels up, and a circular tree has
  no row scale to share, so that is a different product.
- **Stats.** The viewer computes conservation and the logo today and adds no
  more; an agent computes a value and pushes it as a `columnTracks` bar or a
  `rowPanels` strip.
- **A per-cell color matrix.** See `data-layers.md`.

## The work, in order

### 1. Stable ids on the SVG panels

`renderToSvg.tsx:148` rewrites each `<g data-layer="…">` into a bare `<g>`. Emit
`<g id="tree-panel">`, `msa-panel` and `tracks-panel` there, and add `id=` to
the React-emitted minimap and legend groups. Leave the `clipPath` ids namespaced
by `model.id`, which keeps two viewers on one page from colliding and is why the
CLI pins `id: 'msaview-export'` (`packages/cli/src/export-svg.ts:79`). A figure
can then be taken apart in Illustrator or svgutils.

No model change, no parity surface. Half a day. Test: two different `model.id`
values produce the same panel ids. Shipped 2026-09-16.

### 2. Internal node labels

`parseNewick.ts` pins `postParenNumeric: 'name'` so that `((A,B)95,(C,D)80);`
reads 95 as a label, and `generateNodeIds` keeps it. The value sits in
`node.data.name` and reaches the click map through `renderNodeBubbles`
(`renderTreeCanvas.ts:265`); nothing draws it.

Add `renderNodeLabels` over `forEachNodeInBlock` (`renderTreeCanvas.ts:42`) and
a `drawNodeLabels` property on the tree model. Gate on
`node.height >= 1 && name !== id`: `withId` sets `name: node.name || id`
(`msa-parsers/src/util.ts:21`), so an unlabelled internal node reports its id as
its name and an ungated pass prints `node-0-1-1` across the tree.
`renderCollapsedTriangles` already carries this guard.

About 60 lines, and the SVG export comes with it because `renderTreeCanvas` is
the shared path (`renderToSvg.tsx:299`). Half a day. Shipped 2026-09-16 as
`drawNodeLabels`, a tree toggle beside `drawNodeBubbles` with no parity surface.

### 3. Scales, `rowData`, `tipLabel` and `rowTint`

The gate for steps 5 through 11.

- `packages/lib/src/scales.ts`, new: `resolveScale(spec, values)` returning
  `{ colorOf, legend, kind }`, handling `{palette}` and `{map}`. Continuous
  scales wait for a caller.
- `ggplotPalettes.ts`: export the palettes by name, keeping the default export
  that `createPaletteMap.ts:3` consumes. Give `createPaletteMap` an optional
  palette argument so the domain palette and a named palette share one
  implementation.
- `model.ts`: the `rowData` property and the `encodings` array,
  `rowDataOf(name)`, `rowFields`, and `resolvedEncodings`, which resolves each
  scale once per change of inputs.
- `renderTreeLabels` (`renderTreeCanvas.ts:358`): color from the `tipLabel`
  channel.
- `rowTint`: the alpha wash over the culled overlay, across the tree gutter and
  the alignment. Closes [row-group-coloring](row-group-coloring.md).
- Fix the two overlay defects listed above.
- Parity: `MSAViewer.tsx`, `USAGE.md` (pinned by `MSAViewer.docs.test.ts`),
  `msaview.R` plus a `layers.R` entry (pinned by `test-layer-coverage.R`), and
  the Python trait plus `src/render.ts` (pinned by `test_traits.py`).

R takes the table as a data frame through `geom_msa_rowdata(df)` and the scale
through `scale_row_color(field, channel =, palette =)`, since a ggtree user
already holds `tibble(label =, trait =)`. Row names need `sanitize_names`
applied to the table's **keys**, and a `convert_*` beside `convert_highlights`
and `convert_column_tracks`; `test-names.R` exists because a missing conversion
draws nothing and reports nothing.

Leave `rowData` and `encodings` out of `preservedOnReset` (`model.ts:194`). An
encoding naming a field of the previous file would color nothing.

Roughly 450 lines plus 250 of test. Three days. Shipped 2026-09-16: `scales.ts`,
`rowData` over `data.treeMetadata`, `encodings`, `resolvedEncodings`,
`tipLabelColors`, `rowTints`, both overlay fixes, and all four wrapper surfaces.
The `treeMetadata` getter is gone; `rowDataOf` replaces it.

### 4. One legend for every scale

`AnnotationLegend.tsx` and `LegendSVG` (`renderToSvg.tsx:228-282`) are two
renderings of one list: `visibleDomainTypes` (`model.ts:2731`) plus
`fillPalette` (`model.ts:2691`). Add
`model.legends: { id, title, entries: {label, color}[] }[]` and have both read
it, with the domain key as the only producer. That commit changes no behavior.
Then add each categorical scale from step 3 as a producer, and give the
on-screen overlay a stacking rule, since it is one
`position: absolute; top: 4; right: 4` box today. `getLegendWidth` and
`legendHeight` (`renderToSvg.tsx:39-50`) measure across all of them.

Keep the property name `showDomainLegend` (`model.ts:303`). It sits in
`preservedOnReset` and travels in shared URLs.

One day. From here on every scale, on any panel, has a legend without further
work. Shipped 2026-09-16 as `model.legends`, with `legendRows` behind both
renderings: the domain key first, then one legend per field an encoding reads,
titled by the field.

### 5. The `branch` channel

One post-order pass over `get tree()` per change of `rowData` and the encoding,
storing on each internal node the shared value of its tips or nothing.
`renderTree` (`renderTreeCanvas.ts`) reads it when it strokes the edge from a
node to its parent, in the color the resolved scale gives that value. The pass
memoizes with `resolvedEncodings` from step 3, and the legend is the same one
the `tipLabel` channel over the same field produces, so a figure that colors
labels and branches by lineage lists lineage once. Half a day. Shipped
2026-09-16 as `model.branchColors`, a map from node id to color that
`renderTree` and `renderCollapsedTriangles` read.

### 6. `featureFill`, `featureLabel` and GFF `color=`

The `featureFill` encoding resolves a scale over a field of the feature table,
and `fillPalette` becomes the fallback when no encoding names one. A GFF
`color=` attribute overrides per feature. `featureLabel` names the field drawn
inside a span when it fits, with the same measure-then-draw test the exon number
uses (`renderBoxFeatureCanvasBlock.ts:117`), so a gene arrow carries its name.
Both apply to the alignment overlay first, and step 9 reads the same resolution.

Closes `data-layers.md` item 3. One day. Shipped 2026-09-16: `featureFill`,
`featureLabel` and `Annotation.color` from a GFF `color=`, with the domain
legend listing the scale's values under the field's name.

### 7. MRCA and the clade highlight rectangle

`mrca(hierarchy, names)` in `hierarchy.ts`, iterative for the reason that file
states. The rectangle runs from `getNodeX` (`renderTreeCanvas.ts:71`) to the
tree area edge across `[node.xMin!, node.xMax!]`, the span `clusterLayout` sets
(`hierarchy.ts:78-95`). A clade spanning 500 rows crosses many `blocksY`, so the
rectangle draws in every block whose range intersects it, clipped by the block.
One day.

Shipped 2026-09-16 as the `clades` property with the `highlight` mark, reaching
all four wrappers. `resolvedClades` gives each clade the rows it covers, and
`nodeCoveringRows` (`hierarchy.ts`) descends to the node the rectangle starts
at, so a block places it in the tree's depth rather than a traversal. The
alignment band comes through `renderHighlights`, the path the row sets take.
`bracket`, `collapse` and `focus` stay in step 11.

### 8. The `rowPanels` container and the `strip` kind

`components/rowpanels/`: `RowPanels.tsx` mounting one canvas per record,
`renderStrip.ts`. Mount between `TreePanel` and `VerticalResizeHandle` in
`MainArea` (`MSAView.tsx:103-108`).

- Subtract the panels' total width in `msaAreaWidth` (`model.ts:1198`). That
  getter feeds `blocksX`, `showHorizontalScrollbar`, `msaCanvasWidth`, the
  minimap width and `fitHorizontally`.
- Use `blocksY` and `getVisibleLeaves` as `TreeCanvasBlock` does. The panel is
  3.7M pixels tall at 230k rows.
- Portal any cell tooltip. The scroll transform is a containing block
  (`TreeCanvasBlock.tsx:156-169`).
- Give the headers their own band. `TopArea` (`MSAView.tsx:20-28`) holds
  `TreeRuler` and `Minimap`, whose height moves with `showHorizontalScrollbar`.
- Keep row panels out of the track machinery. `BasicTrackModel`
  (`types.ts:19-30`), `drawTrackBlock`'s `-offsetX` transform
  (`drawTracks.ts:340`), `turnedOffTracks`, `heightKey`, `trackHeights` and
  `hideGaps` are all column space.
- `renderToSvg.tsx` needs a third `ClipGroup` and a correction to the four
  `translate(${treeAreaWidth} …)` sites at :209, :218, :357 and :439.
- Parity across the four wrappers, as in step 3.

About 350 lines plus 150 of test. Two days, and it closes the `gheatmap`.

Shipped 2026-09-16 as the `rowPanels` property with the `strip` kind, reaching
all four wrappers. `resolvedRowPanels` gives each strip its color per row name,
its pixel column and its legend entries, and `rowPanelsWidth` comes out of
`msaAreaWidth`, which moves the alignment, the minimap and the tracks right by
the strips. The headers share the top band with the tree ruler and the minimap,
as DOM text on screen and `rotate(-90)` in the export, each clipped to the
band's height. `renderStrip.ts` is the one draw path, and the export adds a
`rowpanels-panel` clip group between the tree and the alignment.

### 9. The `features` kind and the `align` transform

A `features` row panel draws `annotationsByRow` with the span mark from
`renderBoxFeatureCanvasBlock.ts`, extracted so the alignment overlay and the
panel call one function with a different x mapping. `x: "column"` reuses
`domainBands`. `x: "position"` maps `start`/`end` through a linear scale over
the widest row after `align`, with `width` on the record as the panel's pixel
width. Lane packing reuses `packDomainLanes`
(`components/msa/packDomainLanes.ts:13`), generalized from
`Omit<DomainBand, 'lane' | 'laneCount'>[]` to
`<T extends { startCol: number; endCol: number }>`; a second packer is not
needed. The fill and the label come from step 6.

Shipped 2026-09-16 as the `features` kind and the `align` transform, reaching
all four wrappers. `drawFeatureSpans.ts` is the one span mark: the overlay and
the panel each give it an x mapping, the colors, the labels and a row geometry.
`resolvedRowPanels` resolves a panel's spans to panel pixels, `x: "position"`
mapping the extent every row covers, after the shift `featureAlignShifts` gives
it, onto the panel width. A record's own `encoding` resolves the way
`featureFill` and `featureLabel` do and falls back to them, and its legend
merges by field. The domain key lists nothing at zero columns, so a tree, a GFF
and a `features` panel draw the gene figure with one legend and no alignment.

A tree with no alignment already boots: `dataInitialized` is
`!!(self.data.msa || self.data.tree)` (`model.ts:2254`), and `numColumns` of 0
is guarded at `model.ts:2656` and `model.ts:3077`. With `msa` absent the
alignment panel has zero width and the features panel fills the space.

About 250 lines. Two days, and the gene figure is complete.

### 10. The tree overview

`components/tree/TreeOverview.tsx` and `renderTreeOverview.ts`, with the
offscreen cache described above. A `showTreeOverview` property, off by default,
and an `overviewHeight`. Click sets `showOnly`; a second click on the same box
clears it, matching the existing focus toggle. Export as
`<g id="tree-overview">` above the tree panel. One day.

Shipped 2026-09-16 as `showTreeOverview` and `overviewHeight`, with a checkbox
in the tree settings menu. `treeOverviewLayout` lays the whole tree out in
tip-index space from `tree` with the collapses applied and the focus left out,
so one layout serves any band size, and `treeOverviewHit(y)` reads the tip rows
under a pixel and returns the deepest subtree covering them, lifting off a tip
so a click never leaves one row on screen. `treeOverviewImage` holds the tree
and the clade rectangles on an offscreen canvas keyed on the values behind the
layout, and each frame blits it and strokes the focus box and the hovered
candidate on top. `drawTreeOverview` drops a branch that moves less than a pixel
on both axes: of the 524286 branches in a 262k-tip tree, about 510 are drawn
into a 400x120 band.

### 11. Clade brackets, collapse and focus

The bracket needs `treeAreaWidth` to reserve a right gutter or it lands under
the first row panel. Draw the label horizontally, as ggtree does where it fits.
The `collapse` and `focus` marks seed `collapsed` and `showOnly` per the
decision above. Seeding a collapse rebuilds the raster tile cache at load, since
`collapsed` changes `leaves` and `leaves` keys `rasterKeys`
(`msaRaster.ts:298`).

One day, and the H5 figure is complete.

Shipped 2026-09-16 as the `bracket`, `collapse` and `focus` marks.
`cladeGutterWidth` carves the gutter out of the right of the tree area, so the
tip labels and `treeWidth` both give way to it and the bar lands clear of the
row panels. `renderCladeBrackets` draws the bar on the tree canvas, which the
export shares, and the label is DOM text in `CladeLabels.tsx` on screen and a
`<text>` from `CladeLabelsSVG` in the export, turned on its side for a clade
shorter than the font. The seeding runs once in `afterCreate`, so an expand
sticks for the session.

## Sequence

Steps 1 through 11 run about two and a half weeks. Steps 1, 2, 4, 5 and 7 each
ship on their own with nothing owed afterwards, so the sequence is safe to
interrupt. Steps 1 and 2 can run beside step 3, since they touch
`renderToSvg.tsx` and a new function in `renderTreeCanvas.ts` and step 3 touches
`model.ts`, `renderTreeLabels` and `renderHighlights.ts`.

Building step 8 before step 3 ships a second palette resolver and a second
legend source, and then needs deprecating across six surfaces. Building step 6
before step 4 designs the legend around domain accessions alone and reshapes it
when a second producer arrives.

## Tutorials

Each step produces its data outside the viewer, so each one has a tutorial.
`docs/tutorials/notebook_flu_drift.md` already builds an influenza alignment and
tree, which makes the H5 surveillance figure the end of that sequence: segment
lineages as a `rowData` table, `strip` panels for the matrix, MRCA clades for
the brackets, and an SVG export. The gene figure gets a tutorial of its own:
NCBI Datasets for the genomes, a GFF per genome trimmed to the neighborhood, a
tree from a marker gene, and a `rowPanels` record with `align`.
