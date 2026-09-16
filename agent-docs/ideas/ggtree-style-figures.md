# ggtree-style figures

ggtree composes a phylogeny and its metadata into one figure: a phylogram
carrying support values on internal nodes, translucent rectangles behind named
clades, labeled brackets beside them, collapsed clades drawn as triangles, tip
labels colored by a trait, and a tip-aligned categorical matrix with a legend.
react-msaview draws the phylogram, the triangles and the tip labels. This file
plans the rest, in the order it should be built.

## What the figure needs

| Mark                             | ggtree           | react-msaview today                                            |
| -------------------------------- | ---------------- | -------------------------------------------------------------- |
| Phylogram, scale bar             | `ggtree`         | `renderTree`, `TreeRuler`                                      |
| Collapsed clade + tip count      | `collapse`       | `renderCollapsedTriangles` (`renderTreeCanvas.ts:135`)         |
| Tip labels                       | `geom_tiplab`    | `renderTreeLabels` (`renderTreeCanvas.ts:287`)                 |
| Tip labels colored by a trait    | `aes(color=)`    | missing; `treeMetadata` holds the data and no channel reads it |
| Support values on internal nodes | `geom_nodelab`   | missing; the values are parsed and never drawn                 |
| Clade highlight rectangle        | `geom_hilight`   | missing                                                        |
| Clade bracket + label            | `geom_cladelab`  | missing                                                        |
| Tip-aligned categorical matrix   | `gheatmap`       | missing                                                        |
| Legend for a categorical scale   | `scale_*_manual` | `AnnotationLegend`, keyed to domain accessions only            |

## Decisions

### Encodings are an array of records

```json
"encodings": [
  { "channel": "tipLabel", "field": "lineage", "scale": { "palette": "ggplot" } },
  { "channel": "rowTint", "field": "clade", "scale": { "map": { "19B": "#e41a1c" } } },
  { "channel": "strip", "field": "HA" },
  { "channel": "strip", "field": "NA" }
]
```

Eight `strip` encodings reproduce a `gheatmap`, so the matrix panel needs no
property of its own. `columnTracks`, `highlights` and `residueMappings` already
take this shape: one property holding an array of frozen records with a
discriminator, which all four wrappers pass through without enumerating the
values. The channel vocabulary is therefore data, and R reaches every channel
through one `geom_msa_encoding(channel=, field=, scale=)`.

An object keyed by channel (`encodings: { tipLabel: …, rowTint: … }`) was
rejected. `embedApiParity.test.ts` and `test-layer-coverage.R` compare property
_names_ as sets, so a per-channel key structure counts as one name and lets a
wrapper expose `tipLabel`, omit `rowTint`, and keep both tests green. The array
form has nothing to omit.

`data-layers.md:78` sketches `rowStrips: [{key, colors}]` as a separate
property. Building it would ship a second palette resolver and a second legend
producer, and the property would then need deprecating across the snapshot, the
shared URL, `USAGE.md`, `msaview.R`, `layers.R` and the Python traits. Update
that section when this lands.

### One row table, stored where the size rule already runs

The public property is `rowData`, a map from row name to fields, because the
table is keyed by row name. The model serializes it into `data.treeMetadata`,
the JSON string that exists today, so the 50 kB inline limit (`model.ts:1048`,
`constants.ts:85`), the `postProcessSnapshot` strip (`model.ts:3350`) and
`treeMetadataFilehandle` (`model.ts:390`, loader at `model.ts:3227`) all apply
without new code. The snapshot field keeps the name `data.treeMetadata`, which
travels in existing links, the same reason `bgColor` kept its name under
`residueEncoding`.

`rowDataOf(name)` becomes the single reader and replaces the three call sites
that read `?.genome` for a display label (`model.ts:1587`,
`renderTreeCanvas.ts:340`, `model.ts:2951`).

**No `treeMetadata` property exists on `MSAViewer`** (`MSAViewer.tsx:36-104`)
and no `tree_metadata` trait exists in Python. The row table is reachable only
through a snapshot or a filehandle today, so every row channel is blocked until
step 3 adds the property.

A 5000-row table with 8 fields runs to roughly 700 kB, which exceeds the inline
limit by 14x and the 8,192-character `?data=` request line by far more
(`docs/layers.md:110`). Say so in the docs: a real metadata table needs the
filehandle.

### A row tint draws as an overlay

CLAUDE.md requires the raster tile cache to key on every input to a cell's
color. A tint that replaced a cell background would enter `RasterSpec`
(`msaRaster.ts:17`), `rasterKeys` (`msaRaster.ts:295`) and `cellPixelFn`
(`msaRaster.ts:65`), and from there the minimap thumbnail and the `<image>`
export path. Draw it as an alpha wash in `renderHighlights`, the path
`highlights` with `rows` already takes (`renderHighlights.ts:107`,
`renderTreeCanvas.ts:425`). The raster and the thumbnail stay untouched and the
SVG export comes through `renderPersistentHighlights`.

That path carries two defects that a tint over every row would expose, and step
3 fixes both:

- `renderHighlights.ts:108-111` draws every entry of `rowIndices` in every block
  with no visible-row test, and `renderMouseover` redraws on pointer move.
- `renderTreeCanvas.ts:432` is `Math.min(...rowIndices)`. The spread throws
  `RangeError` past about 125k arguments, which `model.ts:1608-1616` already
  works around for the 230k-tip COVID tree.

### A clade is addressed by the MRCA of a tip set plus a tip count

Node ids are path-derived (`msa-parsers/src/util.ts:33`, asserted as
`node-0-1-1-0-2` in `util.test.ts:19`). They are reproducible outside the
viewer, since `generateNodeIds` is pure and exported, and they are still the
wrong address: a re-rooted tree repoints them, and their length grows with
depth, so the 50k-deep caterpillar in `util.test.ts:31` produces a single id of
roughly 200 kB. `model.ts:2389` already clears `collapsed` on `replaceTree` for
the same reason.

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
rather than a rectangle over the wrong clade. `residueMappings.rowLength` guards
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

`mark: "collapse"` and `mark: "focus"` seed the existing `collapsed` array and
`showOnly` once in `afterCreate`, the way `highlightColumns` seeds
`highlightedColumns` (`model.ts:3088`). A parallel collapse list would miss
`hideGapsEffective` (`model.ts:940`), `get root()` and
`renderCollapsedTriangles`, all of which read `collapsed`.

### Rotated text stays outside the canvas layer

`packages/svgcanvas/src/index.ts` implements `scale`, `translate` and
`setTransform`, and no `rotate`; `RenderCtx` (`components/renderCtx.ts:7-34`)
does not list it either. Strip headers and bracket labels are chrome, so draw
them as DOM text with `writing-mode: vertical-rl` on screen and as React
`<text transform="rotate(-90 …)">` in the export, beside the canvas layer, the
way `TrackLabelsSVG` emits track names (`renderToSvg.tsx:455`). Adding
`rotate()` to svgcanvas is about six lines whenever a renderer call needs it,
since `__applyTransformation` (`index.ts:220`) already emits a matrix.

## The work, in order

### 1. Stable ids on the SVG panels

`renderToSvg.tsx:148` rewrites each `<g data-layer="…">` into a bare `<g>`. Emit
`<g id="tree-panel">`, `msa-panel` and `tracks-panel` there, and add `id=` to
the React-emitted minimap and legend groups. Leave the `clipPath` ids namespaced
by `model.id`, which keeps two viewers on one page from colliding and is why the
CLI pins `id: 'msaview-export'` (`packages/cli/src/export-svg.ts:79`). A figure
can then be taken apart in Illustrator or svgutils.

No model change, no parity surface. Half a day. Test: two different `model.id`
values produce the same panel ids.

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
the shared path (`renderToSvg.tsx:299`). Half a day.

### 3. Scales, `rowData`, and the `tipLabel` channel

The gate for steps 5 through 8.

- `packages/lib/src/scales.ts`, new: `resolveScale(spec, values)` returning
  `{ colorOf, legend, kind }`, handling `{palette}` and `{map}`. Continuous
  scales wait for a caller.
- `ggplotPalettes.ts`: export the palettes by name, keeping the default export
  that `createPaletteMap.ts:3` consumes. Give `createPaletteMap` an optional
  palette argument so the domain palette and a named palette share one
  implementation.
- `model.ts`: the `rowData` property and the `encodings` array,
  `rowDataOf(name)`, `rowFields`, and `resolvedEncodings`, which resolves each
  palette once rather than per row per frame.
- `renderTreeLabels` (`renderTreeCanvas.ts:358`): color from the `tipLabel`
  channel.
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

Roughly 400 lines plus 250 of test. Two to three days.

### 4. MRCA and the clade highlight rectangle

`mrca(hierarchy, names)` in `hierarchy.ts`, iterative for the reason that file
states. The rectangle runs from `getNodeX` (`renderTreeCanvas.ts:71`) to the
tree area edge across `[node.xMin!, node.xMax!]`, the span `clusterLayout` sets
(`hierarchy.ts:78-95`).

A clade spanning 500 rows crosses many `blocksY`. Draw the rectangle in every
intersecting block and the label only in the block holding the clade's vertical
midpoint, using `blockPad` (`renderTreeCanvas.ts:23`) as the straddling
convention. Insert the label box into `ClickMapIndex` and never the rectangle: a
rectangle over the tree area would swallow tip-label clicks.

One day.

### 5. One legend for every scale

`AnnotationLegend.tsx` and `LegendSVG` (`renderToSvg.tsx:228-282`) are two
renderings of one list: `visibleDomainTypes` (`model.ts:2731`) plus
`fillPalette` (`model.ts:2691`). Add
`model.legends: { id, title, entries: {label, color}[] }[]` and have both read
it, with the domain key as the only producer. That commit changes no behavior.
Then add each categorical encoding as a producer, and give the on-screen overlay
a stacking rule, since it is one `position: absolute; top: 4; right: 4` box
today. `getLegendWidth` and `legendHeight` (`renderToSvg.tsx:39-50`) measure
across all of them.

Keep the property name `showDomainLegend` (`model.ts:303`). It sits in
`preservedOnReset` and travels in shared URLs.

A continuous legend is a gradient bar. `LegendSVG` is React JSX, so
`<linearGradient>` in `<defs>` works there even though svgcanvas dropped
gradients.

One day.

### 6. The `rowTint` channel

The alpha wash over the culled overlay from step 3, across the tree gutter and
the alignment. Half a day, and it closes
[row-group-coloring](row-group-coloring.md).

### 7. The `strip` channel and its panel

`components/rowstrips/`: `RowStripsPanel.tsx`, `RowStripsCanvas.tsx`,
`renderRowStrips.ts`. Mount between `TreePanel` and `VerticalResizeHandle` in
`MainArea` (`MSAView.tsx:103-108`).

- Subtract the strip width in `msaAreaWidth` (`model.ts:1198`). That getter
  feeds `blocksX`, `showHorizontalScrollbar`, `msaCanvasWidth`, the minimap
  width and `fitHorizontally`.
- Use `blocksY` and `getVisibleLeaves` as `TreeCanvasBlock` does. The panel is
  3.7M pixels tall at 230k rows.
- Portal any strip-cell tooltip. The scroll transform is a containing block
  (`TreeCanvasBlock.tsx:156-169`).
- Give the headers their own band. `TopArea` (`MSAView.tsx:20-28`) holds
  `TreeRuler` and `Minimap`, whose height moves with `showHorizontalScrollbar`.
- Keep strips out of the track machinery. `BasicTrackModel` (`types.ts:19-30`),
  `drawTrackBlock`'s `-offsetX` transform (`drawTracks.ts:340`),
  `turnedOffTracks`, `heightKey`, `trackHeights` and `hideGaps` are all column
  space.
- `renderToSvg.tsx` needs a third `ClipGroup` and a correction to the four
  `translate(${treeAreaWidth} …)` sites at :209, :218, :357 and :439.

About 350 lines plus 150 of test. Two days, and it closes the `gheatmap`.

### 8. Clade brackets, collapse and focus

The bracket needs `treeAreaWidth` to reserve a right gutter or it lands under
the alignment. Draw the label horizontally, as ggtree does where it fits. The
`collapse` and `focus` marks seed `collapsed` and `showOnly` per the decision
above. Seeding a collapse rebuilds the raster tile cache at load, since
`collapsed` changes `leaves` and `leaves` keys `rasterKeys`
(`msaRaster.ts:298`).

One day, and the figure is complete.

## What comes with the plan

- A `residueFill` channel over `scales.ts` is a custom residue color scheme,
  which is `data-layers.md` layer 5.
- A tree with no alignment already boots: `dataInitialized` is
  `!!(self.data.msa || self.data.tree)` (`model.ts:2254`), and `numColumns` of 0
  is guarded at `model.ts:2656` and `model.ts:3077`. Tree plus strips plus
  legend is a figure this plan produces without extra work.

## Deferred

**Column-space feature boxes** (`kind: 'feature'` on `columnTracks`, for gene
models and regions of interest) are well specified and about 200 lines, and they
draw nothing the ggtree figure contains. Two prerequisites: `data-layers.md:149`
puts GFF `color=` ahead of JSON features in its own order, and shipping a
feature box first leaves two box paints under different color rules, one of
which a producer still cannot override (`fillPalette`, `model.ts:2691`). The
sub-row packing is
[interpro-box-stacking-overflow](interpro-box-stacking-overflow.md), which is
blocked on a minimum-height decision. Generalize `packDomainLanes`
(`components/msa/packDomainLanes.ts:13`) from
`Omit<DomainBand, 'lane' | 'laneCount'>[]` to
`<T extends { startCol: number; endCol: number }>` when the time comes; a second
packer is not needed. Project a box's end through the domain rule
(`model.ts:2784`, `visibleColsBefore(blanks, end + 1)`) so it stops before a
following gap run, where `resolve()` for arcs (`model.ts:1703`) snaps a hidden
endpoint to its neighbor.

**A 2D overview panel and scrollbar markers** serve navigation. `getLayout`
(`renderToSvg.tsx:85-88`) already reasons that a minimap over an alignment that
fits marks a viewport wider than the bar, and a publication figure is an
`entire` export, so the overview would be a panel absent from the output it
exists to improve. The markers have little to mark: `resolvedHighlights` holds
author-supplied bands that are already on screen, and the marker's real source
is search hits, which [find-and-search](find-and-search.md) says do not exist.
`msaThumbnail` is also not the overview image it looks like. It passes `rowStep`
and `colStep`, so it takes the decimation branch (`msaRaster.ts:131`) and never
`averagePixels`; at 230k rows into 200 pixels it draws one row in 1150. A
navigable overview needs the averaging path. Revisit after find-and-search.

## Sequence

Steps 1 through 8 run about ten days and produce the whole figure. Steps 1, 2, 5
and 6 each ship on their own with nothing owed afterwards, so the sequence is
safe to interrupt.

Building step 7 before step 3 is the costly inversion: a `rowStrips` property
ships a second palette resolver and a second legend source, and then needs
deprecating across six surfaces. Building step 5 before step 3 designs the
legend entry around domain accessions alone and reshapes it when a second
producer arrives.

## Tutorials

Each step produces its data outside the viewer, so each one has a tutorial.
`docs/tutorials/notebook_flu_drift.md` already builds an influenza alignment and
tree, which makes the H5 surveillance figure the natural end of this sequence:
segment lineages as a `rowData` table, `strip` encodings for the matrix, MRCA
clades for the brackets, and an SVG export.
