# Viewer architecture

How the viewer's subsystems fit together and the decisions behind them. The
traps an edit would hit silently are in `packages/lib/CLAUDE.md`; this is the
background.

## The model

- `packages/lib/src/model.ts` is one large MST model. Its properties, views and
  actions stay in that file, and an edit to them is inline. A function that
  never reads `self` goes beside it: `treeDisplay.ts` (tree transforms, clade
  resolution), `featurePanels.ts` (row-panel lanes, colors, spans) and
  `filehandleLoader.ts` (the latest-wins fetch loop, `createAbortRotation`,
  after jbrowse-components').
- Canvas rendering uses a tiled block system (`calculateBlocks.ts`) so a large
  alignment never renders whole.
- Blocks are positioned at their offsets only; `scrollX`/`scrollY` live on one
  transformed container per panel (`MSACanvas`, `TreeCanvas`, `TrackBlocks`). A
  transformed ancestor becomes the containing block of anything
  `position: fixed` inside it, which is why such elements are portaled.

## Domains and features

- Domain visualization is a core feature: the GFF path,
  `File → Open annotation file…` (GFF3 as the CLI writes it, or an InterProScan
  JSON response, converted to GFF on the way in), the overlay, the legend, the
  filter dialog, `annotationsByRow`. The dialog stores its file in `data.gff`,
  so the annotations travel in the snapshot and the shared URL like every other
  layer.
- The viewer does not produce the file. `react-msaview-cli interpro` builds it
  from precomputed matches in seconds, where the EBI iprscan5 queue the viewer
  used to submit to took fifteen minutes.
- A host that computes its spans passes them as the `features` layer, JSON
  records `featuresLayer.ts` converts to annotations, cached per record so
  `featureColors` can key on them outside a reaction. `allAnnotations` puts them
  after the GFF's, and every overlay reader takes that list.
- A span takes its color from its own GFF `color=` attribute first, then from a
  `featureFill` encoding's scale over a field of the feature table, then from
  `fillPalette` where no encoding is set and grey where one is.
  `model.featureColors` resolves that once per change of the features, the
  encodings or the palette. A `featureLabel` encoding names the field
  `renderBoxFeatureCanvasBlock` draws inside each span wherever the text fits.

## Color

- The color scheme is a categorical scale over residue letters, and the public
  `residueEncoding` prop names the channel it paints: `fill` colors the cell,
  `color` colors the letter. The MST property behind it stays `bgColor`, because
  that name travels in the shared URL. The vocabulary is the one
  jbrowse-components uses for `LinearMarkDisplay` (marks, encodings, channels,
  scales).
- The `colorScheme` prop takes a scheme name or a color object's
  `{domain, range}` over letters, which the model keeps as the letter map
  `customColorScheme` and which wins over `colorSchemeName` while set.
  `dynamicColorSchemeName` is undefined under a map.
- A domain box and the scale contend for the cell fill, and `cellFill` in
  `model.ts` names the owner: `residue` (the scheme), `domain` (the boxes), or
  `none`, which is `residueEncoding: 'color'`. Domains own it only while shown
  and `domainFill` is on, its default, so a loaded GFF fills the cells; picking
  a scheme in the menu sets `domainFill` off, since a scheme picked under the
  boxes would change nothing on screen.
- Whenever the domains do not own the fill and the letters are big enough to
  draw, `domainUnderline` marks each span with a `domainUnderlineHeight` bar
  along the bottom of the row, drawn after the residue tiles. A filled box wins
  the row back wherever the letters cannot carry the scale: sub-row layout, and
  zoomed out past `minLetterRowHeight`.
- `contrastTextFn(theme)` in `util.ts` picks a letter's color from the
  background of the cell it lands on, memoized per theme.

## The alignment raster

- The background on screen comes from `components/msa/msaRaster.ts`: one pixel
  per cell, built lazily in 512-pixel tiles and blitted with `drawImage`, so a
  zoom frame costs a few blits instead of a `fillRect` per visible cell.
- The cache keys on every input to a cell's color. The tile map also keys on the
  cells-per-pixel span, per axis: below one device pixel per cell a tile
  averages cells into a pixel, the browser's smoothing blurs both axes, and at
  fit-to-width only the columns are narrow.
- `MSACanvasBlock` decides whether the raster applies and passes `rasterTiles`
  to `renderMSABlock`. The SVG export draws the same background as one `<image>`
  (`rasterImageHref`) where a canvas can be read back, and falls back to
  per-cell rects where it cannot (jsdom). Letters stay `fillText`, since a glyph
  sprite atlas measured 2-3x slower.
- The minimap bar draws the same raster sampled down to at most 2000 columns.

## Row panels

- `rowPanels` is the row-scale counterpart of `columnTracks`:
  `components/rowpanels/RowPanels.tsx` mounts one canvas column per record
  between the tree and the alignment, tiled by `blocksY`, and
  `renderRowPanel.ts` dispatches on the record's `kind` for the live view and
  the SVG export both. `rowPanelsWidth` comes out of `msaAreaWidth`, which moves
  the alignment, the minimap and the tracks right by the panels; the headers
  take their own band in `TopArea` and export as a `rotate(-90)` text each. Row
  panels stay out of the track machinery, which is column space.
- `renderStrip.ts` draws the `strip` kind, a cell per row. `features` draws the
  GFF's spans per row through `components/msa/drawFeatureSpans.ts`, the one span
  mark: the alignment's overlay (`renderBoxFeatureCanvasBlock.ts`), the panel
  and a `features` column track each hand it an x mapping, the fills, the labels
  and a row geometry, so a strand arrow is drawn in one place.
- The head is the last `headLength` pixels _of_ the feature, tapering to a point
  at its end the way gggenes and gggenomes draw one, and a feature shorter than
  the head is all head. A glyph covers its own span and nothing past it, so the
  genes of an operon butt together. A `headRise` lifts the head above a band too
  thin to taper, which the underline bar is.
- `resolvedRowPanels` resolves a panel's spans to panel pixels: `x: "column"`
  scales `domainBands` by `colWidth`, and `x: "position"` packs each row's
  features in residue positions through `packDomainLanes` (generic over
  `{startCol, endCol}`) and maps their extent onto the panel width. The packing
  shrinks each pixel span by a tenth before testing overlap, because adjacent
  bacterial genes commonly share a few bases.
- Both `x` modes hand their unlaned spans to `panelLanes`, which dispatches on
  the record's `position`: `strandpile` packs each strand on its own and lays
  every row out on one grid, sized by the deepest row on each side, so the line
  between the strands holds still down the panel. A `position` is a lane
  assignment and nothing else; no mode of it reaches `drawFeatureSpans`. The
  `align` transform's per-row shift comes from `featureAlignShifts`.
- A record's own `encoding` resolves through `resolveScale` and
  `featureFields.ts` the way the top-level `featureFill` and `featureLabel` do,
  and falls back to them.
- A tree, a `gff` and a `features` panel make a figure with no alignment at all:
  `dataInitialized` is `msa || tree`, `numColumns` is 0, and the alignment panel
  is zero columns wide on screen and in the export.

## The tree

- Node ids are path-derived from `tree`, which is `inputTree` after `treeRoot`
  reroots it (`rootTree` in `treeDisplay.ts`, over `@gmod/newick`'s `rerootTree`
  and `midpointRoot`). `collapsed`, `rotated` and `showOnly` hold those ids, so
  `setTreeRoot` clears them through `clearNodeState` and the seeding clade marks
  apply again. `treeRoot` names tips, so it survives a reload of the same tree.
  `buildTreeRoot` sorts each node's children by `treeOrder`, then reverses the
  `rotated` ones.
- `msa-parsers`' `parseTree` reads every tree format the viewer takes (Newick,
  EMF, NCBI ASN.1), and `writeNewick` hands `@gmod/newick`'s writer the drawn
  tree with generated ids dropped.
- `rowTransform` (`rowTransform.ts`) sits between `tree` and `root`:
  `filteredTree` prunes the tips the filter refuses, keeping every node id, and
  `arrangedTree` sorts and bands the root's children where the file has no tree.
  `buildTreeRoot` reads `arrangedTree`, so every row reader follows it. A facet
  band is a `bracket` clade (`facetClades`), resolved with the `clades` records
  in `resolvedClades`. The design is in
  `agent-docs/ideas/ready/row-transforms.md`.
- The tree overview (`components/tree/TreeOverview.tsx`,
  `renderTreeOverview.ts`) is the brush on the row scale, behind
  `showTreeOverview`. It draws `get tree()` rather than `root`, so the whole
  tree stays on screen while the view shows one subtree, and its height joins
  the `Math.max` of the top band in `msaAreaHeight`. `treeOverviewImage` caches
  the tree and the clade rectangles on an offscreen canvas, since a 230k-branch
  tree cannot be redrawn as the focus box follows the pointer.
- A `clades` record's `mark` picks what it draws. `highlight` fills the rows,
  `bracket` draws a bar with the record's `label`, and `collapse` and `focus`
  seed `collapsed` and `showOnly` once in `afterCreate`, so the collapse the
  tree, `hideGapsEffective` and the alignment all read is the one the branch
  menu writes. `cladeGutterWidth` in `components/tree/cladeBrackets.ts` is the
  column the bracket takes out of the right of the tree area. The canvas draws
  the bar and the label is DOM text (`CladeLabels.tsx`) on screen and a `<text>`
  in the export, since the canvas layer has no rotation.
- `treeAreaWidth` and `treeWidth` are undefined until a snapshot, a prop or the
  divider sets them, and undefined fits the tree area to the labels and the
  tree. The fit measures the labels and the clade gutter at `labelFitFontSize`
  over the whole tree, so a zoom, a collapse or a focus leaves the alignment
  where it is, and the renderer ellipsizes a label that outgrows its room.

## Legends

- `model.legends` is the one list both legend renderings read:
  `components/msa/AnnotationLegend.tsx` on screen and `LegendSVG` in
  `renderToSvg.tsx` for the export. Each producer contributes a section in
  jbrowse-components' `LegendSpec` shape (`legendSpec.ts`),
  `{id, title, note, items}`, where an item is a swatch `{value, label, color}`
  or a ramp `{label, gradient}`. `legendEntries` flattens the sections into
  title, note, swatch and gradient rows, giving each section a title row once
  there is more than one and capping a section at 20 rows plus a `+N more` line.
  The domain overlay, the row-table encodings and the row panels are its
  producers, each keyed by its scale's declaration (`resolvedScales`), so a
  matrix of strips naming one `legend.title` lists one legend.
- A gradient row is a CSS `linear-gradient` on screen and a `<linearGradient>`
  in `<defs>` in the export, which the React half of `renderToSvg.tsx` emits, so
  `packages/svgcanvas` draws no gradient.
- `scales.ts` resolves `ordinal`, `linear`, `log` and `threshold` scales;
  `colorRamp.ts` and `colorRampStops.ts` hold the ramps, the domain and the
  nearest-rank quantile, and `scaleProblems.ts` the rules `scaleProblems` on the
  model reports, all copied from jbrowse-components with the source path in a
  comment. A ramp pinned at both ends is keyed by its declaration alone; one
  with an open end also by its field, since its domain follows that field's
  values.
- A channel nests `scale: {type, domain, range, scheme}` and `legend: {title}`,
  as jbrowse-components' displays do since its ADR-238. Nothing reads an earlier
  spelling: the flat color object, a palette name in `range`, `{palette}`,
  `{map}`, `scales.y`, flat strips and a features panel's `color` and `label`
  were cut over in one change with no reader left. The property behind the
  overlay's collapse toggle stays `showDomainLegend`, because that name travels
  in the shared URL.

## Tracks

- Tracks (conservation, sequence logo, the position ruler, the Stockholm text
  tracks, the pinned copy of the `relativeTo` row) carry a `kind` discriminator
  and share one draw module, `components/tracks/drawTracks.ts`. `drawTrackBlock`
  applies the transform and dispatches on `kind`; the live view calls it from
  `components/tracks/TrackBlocks.tsx` and the SVG export through
  `renderAllTracks`.
- Adding a track kind means a new `kind`, a draw function in that module, a case
  in `drawTrackBlock`, and a case in `components/tracks/TrackTooltipContent.tsx`
  for that track's reading at the hovered column, with no second rendering path
  or component.
- A `features` column track is the span mark on the column axis. Its spans
  resolve to visible columns in `columnTrackContent`, the way the arcs do, and
  pack into lanes through `panelLanes`, so `position: "strandpile"` reads as it
  does on a row panel. `trackAnnotations` in `featuresLayer.ts` converts its
  spans to annotations once per record, and `featureTrackScales` colors them
  through `featureColorMap` and the `fill` scale `resolvedScales` shares with
  the encodings and the row panels, so a scale the track and a panel both
  declare lists one legend.
- `components/Track.tsx` hosts every kind's hover: `useTrackHover` sets the
  model's mouse column and anchors the tooltip, so the column statistics live on
  the tracks that draw them and the alignment's own tooltip stays about the cell
  under the cursor.
- A track model carries a `heightKey` naming the height its divider writes: the
  `kind` for a computed track, so conservation and property conservation resize
  together, and `own:<id>` for a `columnTracks` track, which resizes alone.
  `trackHeights` holds one number per key, absent until the user drags, and
  `defaultTrackHeights` answers until then. A track without a key (the ruler, a
  text track) has no divider. Only the last turned-on track of a key carries the
  handle, and the drag divides across the group. That handle covers only the
  alignment, so `Track` draws a hairline under every track but the last, which
  reaches across the labels too.
- `turnedOffTracks` records only the user's explicit show/hide choices. An id is
  absent until they touch that track, and the value then means "off", so a
  hidden-by-default track (`defaultOffTracks` in `model.ts`) adds nothing to the
  shared URL.

## SVG export

- `packages/svgcanvas` implements only the calls the renderers make, which
  `RenderCtx` in `components/renderCtx.ts` lists, and omits attributes whose
  value equals the SVG default. `renderToSvg` splices each layer's serialized
  markup into the React page as a string, so React never parses it.

## Downstream: jbrowse-plugin-msaview

- `@jbrowse/core` is an external in the downstream jbrowse-plugin-msaview
  bundle, resolved at runtime against the core the host jbrowse-web ships, which
  can be older than this workspace's. A freshly added core export typechecks and
  passes tests here and fails the plugin's `check-host-floor`. A trivial new
  helper gets inlined instead (`statusMessageText` in
  `packages/lib/src/fetchUtils.ts`).
- Core also drops long-established exports: it removed `renderToStaticMarkup`
  from the `@jbrowse/core/util` barrel to keep react-dom out of the RPC worker,
  and jbrowse-plugin-msaview 3.4.0 loaded normally and failed on SVG export.
  `packages/lib/src/renderToStaticMarkup.ts` now inlines it.

## Other packages

- `packages/structure`: a Mol\* panel driven by the model's `hoveredCell`,
  `clickedCell` and `residueMappings`. `findStructures` takes a row's UniProt
  accession from its name, or looks one up from an entry name or RefSeq id,
  finds the structures in AlphaFold DB and RCSB, and writes the
  `residueMappings` record onto each. `superposeRows` fits the structures of
  several rows on the alignment's own correspondences, over a selected column
  range if one is set, and returns the matrices for the panel's `transforms` and
  a per-column CA distance for a `columnTracks` bar, after setting aside the
  pairs more than twice the RMSD from the fit, as PyMOL's `align` does.
  `FacetGrid` shows one panel per group of rows with the cameras tied.
- `searchFoldseek` is the opt-in tier for a row with no identifier: it sends the
  sequence to search.foldseek.com and waits for a queue, so the app offers it as
  a button and never runs it unasked. A PDB hit draws from its own CA trace,
  because the database's chain positions skip unresolved residues and are not
  SEQRES numbering. The lookups and the aligner come from `p2s_mapper`
  (`~/src/gmod/p2s_mapper`), which the protein3d plugin shares.
- Mol\* is a peer dependency that loads on first mount, so nothing in
  `packages/lib` imports it.
- The R package is [GMOD/ggmsaview](https://github.com/GMOD/ggmsaview), at
  `~/src/ggmsaview`. Its `scripts/build-js.mjs` builds the widget from this
  checkout's `packages/lib/bundle`, and its QuickJS bridge (`js/bridge.ts`)
  imports `packages/lib/src` by path. Its `test-props.R` is the R half of the
  embed-API parity check, and `packages/lib/src/embedApiParity.test.ts` the
  Python half.
- `packages/lib/docgen` parses with an aliased TypeScript 6 (`typescript6` in
  the root devDependencies), because the native TypeScript 7 compiler exposes no
  `createProgram`, checker or scanner. Keep the alias when bumping TypeScript.

## The website's tutorial index

- `website/src/pages/tutorials/[slug].astro` globs `docs/tutorials` and
  `index.astro` reads `website/src/lib/tutorials.ts`. The index is cards only:
  every piece of content under `/tutorials` is a page of its own. Each entry
  names a `category`, which groups both the cards and the docs sidebar, and a
  `thumb`, one of that page's own figures, which astro:assets crops to 5:3 at
  build time, so no thumbnail file lands in `docs/media`.
- `tutorials/structure_link.astro` mounts a live alignment beside its Mol\*
  structure, and `tutorials/jbrowse_integration.astro` holds the connected
  JBrowse 2 sessions. `lib/jbrowseLinks.ts` writes each one as a session spec
  and serializes it into a URL. `[slug].astro` builds only slugs the markdown
  glob produces, so a hand-written page at a `/tutorials/<name>` route never
  collides with it.
