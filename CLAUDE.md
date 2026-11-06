## Project overview

react-msaview (JBrowseMSA) is an interactive multiple sequence alignment viewer.
It renders phylogenetic trees alongside protein/DNA alignments using HTML5
canvas with a tiled rendering system for scalability.

## Writing

`docs/WRITING.md` lists the prose habits to avoid in docs, captions and
comments, with rewrites taken from this repo. Read it before writing any of
them, and follow it in this file too: agents copy the prose here as house voice.

## Key packages

- `packages/lib`: main React component library (the core viewer)
- `packages/app`: demo app deployed at gmod.org/JBrowseMSA
- `packages/cli`: domain/exon GFFs (InterPro precomputed matches, InterProScan,
  RefSeq exon models) and headless SVG export. The viewer no longer scans for
  domains, so the CLI is the only way to produce a domain file. `src/usage.ts`
  lists each command's options. `index.ts` parses a command's flags against that
  list, `--help` and the README's option tables render from it,
  `pnpm --filter react-msaview-cli readme` rewrites the tables, and
  `usage.test.ts` fails on a stale one
- `packages/msa-parsers`: parsers for Stockholm, FASTA, Clustal, Newick, EMF,
  A3M, GFF
- `packages/examples`: the live examples the website's /examples page mounts.
  `src/examples/catalog.ts` holds each example's name, category and description,
  and `data/` holds the alignments, trees and GFFs as files, which
  `scripts/screenshots/writeExampleData.mjs` copies into the app
- `packages/structure`: a Mol\* panel driven by the model's `hoveredCell`,
  `clickedCell` and `residueMappings`, plus `findStructures`, which takes a
  row's UniProt accession from its name, or looks one up from an entry name or
  RefSeq id, finds the structures in AlphaFold DB and RCSB, and writes the
  `residueMappings` record onto each. `superposeRows` fits the structures of
  several rows on the alignment's own correspondences, over a selected column
  range if one is set, and returns the matrices for the panel's `transforms` and
  a per-column CA distance for a `columnTracks` bar, after setting aside the
  pairs more than twice the RMSD from the fit, as PyMOL's `align` does. The
  panel paints the alignment's `highlights` on the structure and frames the
  residues the alignment covers, and `FacetGrid` shows one panel per group of
  rows with the cameras tied. `searchFoldseek` is the opt-in tier for a row with
  no identifier: it sends the sequence to search.foldseek.com and waits for a
  queue, so the app offers it as a button and never runs it unasked. A PDB hit
  draws from its own CA trace, because the database's chain positions skip
  unresolved residues and are not SEQRES numbering. The lookups and the aligner
  come from `p2s_mapper` (`~/src/gmod/p2s_mapper`), which the protein3d plugin
  shares. The app keeps the structure area closed until its top-bar toggle is
  pressed, unless the link carries a structure, then mounts the panel beside the
  alignment, and the website's `/tutorials/structure_link` page uses the same
  component. Mol\* is a peer dependency that loads on first mount, so nothing in
  `packages/lib` imports it
- `packages/svgcanvas`: vendored ESM fork of svgcanvas for SVG export
- The R package is [GMOD/ggmsaview](https://github.com/GMOD/ggmsaview), a repo
  of its own, at `~/src/ggmsaview`. Its `scripts/build-js.mjs` builds the widget
  from this checkout's `packages/lib/bundle`, and its QuickJS bridge
  (`js/bridge.ts`) from this checkout's source, importing `packages/lib/src` by
  path: the model, `featureSpanMarks`, `domainOverlaySource`,
  `featurePanelSource`, `barTrackValues`, `columnLogoStack`, `cladeLabelBoxes`,
  `tileColorFn`, `viewerSnapshot` and a few helpers. A rename of one of those
  passes every check here and breaks ggmsaview's next build, so grep its bridge
  first. Its `test-props.R` is the R half of the embed-API parity check, and
  `packages/lib/src/embedApiParity.test.ts` the Python half. The site's
  `/r-package` page is `docs/r-package.md`, which `pnpm sync:ggmsaview` writes
  from ggmsaview's README and gallery, so edit those there and rerun it

- `packages/python`: the `jbrowsemsa` anywidget, named the same on PyPI and in
  `import`. Its traits are the `MSAViewer` props in snake case, and
  `src/render.ts` maps them onto `mount()`. The built
  `jbrowsemsa/static/widget.js` is gitignored and shipped in the wheel

## Tutorials

`docs/tutorials/*.md` are reader-facing walkthroughs of the data preparation
done outside the viewer: sequences to alignment to tree to annotations, ending
on a `#data=` URL that opens the result. Each step of a tutorial consumes what
the step before produced. Every command in it has been run, and the prose quotes
the numbers it printed. `docs/tutorials/scripts/build_<topic>.sh` runs the whole
pipeline, and the `## Reproduce it end to end` section curls it.

Adding one means a file there plus an entry in `website/src/lib/tutorials.ts`;
`website/src/pages/tutorials/[slug].astro` globs the directory and `index.astro`
reads the list. Write a tutorial instead of a viewer feature whenever the work
is data preparation. See `viewer-not-analysis-tool` in the memory and
`agent-docs/reference/data-layers.md`.

The index is the site's gallery, and it is cards only — every piece of content
under `/tutorials` is a page of its own. Each entry names a `category`, which
groups both the cards and the docs sidebar, and a `thumb`, one of that page's
own figures, which astro:assets crops to 5:3 and re-encodes at build time, so a
card cannot drift from its page and no thumbnail file lands in `docs/media`.

Two carded pages have no markdown behind them. `tutorials/structure_link.astro`
mounts a live alignment beside its Mol\* structure, and
`tutorials/jbrowse_integration.astro` holds the connected JBrowse 2 sessions.
`lib/jbrowseLinks.ts` writes each one as a session spec and serializes it into a
URL, and `lib/f12CombinedLinks.ts` holds a generated URL thousands of
percent-encoded characters long. `[slug].astro` builds only slugs the markdown
glob produces, so a hand-written page at a `/tutorials/<name>` route never
collides with it.

There is no second showcase page: the standalone figure wall at `/gallery` was a
static copy of what `/examples` runs live and the tutorials build, so it is gone
and `/gallery` redirects to the index. `docs/media` holds only what a rendered
page shows; a figure that stops being shown loses its screenshot spec too.

Figure bytes live in `s3://jbrowse.org/msaview-figures/`, not in git, and
`media.lock` tracks one content-addressed line per file. `docs/media` is
gitignored apart from the nine figures the published READMEs link by relative
path, so **regenerating a figure leaves `git status` clean** and the bytes reach
anyone else only through `pnpm media:push`. Every script that reads the
directory pulls first. `scripts/media-store/README.md` carries the design and
the numbers behind it.

## Architecture decisions

- `packages/lib/src/model.ts` is one large MST model. Its properties, views and
  actions stay in that one file, and an edit to them is inline. A function that
  never reads `self` goes beside it instead: `treeDisplay.ts` (tree transforms,
  clade resolution), `featurePanels.ts` (row-panel lanes, colors, spans) and
  `filehandleLoader.ts` (the latest-wins fetch loop, `createAbortRotation`,
  after jbrowse-components').
- The viewer uses MobX-state-tree for state management. Components use
  `observer` from mobx-react to reactively re-render.
- Canvas rendering uses a tiled block system (`calculateBlocks.ts`) to avoid
  rendering entire large alignments at once.
- Domain **visualization** is a core feature; do not remove it. That means the
  GFF path: `File → Open annotation file…` (GFF3 as the CLI writes it, or an
  InterProScan JSON response, converted to GFF on the way in), the overlay, the
  legend, the filter dialog, `annotationsByRow`. The dialog stores its file in
  `data.gff`, so the annotations travel in the snapshot and the shared URL like
  every other layer. The viewer does not produce the file.
  `react-msaview-cli interpro` builds it from precomputed matches in seconds,
  where the EBI iprscan5 queue the viewer used to submit to took fifteen
  minutes. A host that computes its spans passes them as the `features` layer,
  JSON records `featuresLayer.ts` converts to annotations, cached per record so
  `featureColors` can key on them outside a reaction. `allAnnotations` puts them
  after the GFF's, and every overlay reader takes that list. A span takes its
  color from its own GFF `color=` attribute first, then from a `featureFill`
  encoding's scale over a field of the feature table, then from `fillPalette`
  where no encoding is set and grey where one is, and `model.featureColors`
  resolves that once per change of the features, the encodings or the palette. A
  `featureLabel` encoding names the field `renderBoxFeatureCanvasBlock` draws
  inside each span wherever the text fits.
- The color scheme is a categorical scale over residue letters, and the public
  `residueEncoding` prop names the channel it paints: `fill` colors the cell,
  `color` colors the letter. The MST property behind it stays `bgColor`, because
  that name travels in the shared URL. The vocabulary is the one
  jbrowse-components uses for `LinearMarkDisplay` (marks, encodings, channels,
  scales); name new public API to match. The `colorScheme` prop takes a scheme
  name or a color object's `{domain, range}` over letters, which the model keeps
  as the letter map `customColorScheme` and which wins over `colorSchemeName`
  while set. Test for a per-column scheme with `dynamicColorSchemeName`, which
  is undefined under a map.
- A domain box and the scale contend for the cell fill, and `cellFill` in
  `model.ts` names the owner: `residue` (the scheme), `domain` (the boxes), or
  `none`, which is `residueEncoding: 'color'`. Domains own it only while shown
  and `domainFill` is on, its default, so a loaded GFF fills the cells; picking
  a scheme in the menu sets `domainFill` off, since a scheme picked under the
  boxes would change nothing on screen. Whenever the domains do not own the fill
  and the letters are big enough to draw, `domainUnderline` marks each span with
  a `domainUnderlineHeight` bar along the bottom of the row, drawn after the
  residue tiles so they do not cover it. A filled box wins the row back wherever
  the letters cannot carry the scale: sub-row layout, which stacks its boxes
  clear of the letters anyway, and zoomed out past `minLetterRowHeight`, where
  the box is the only thing left to read.
- `rowPanels` is the row-scale counterpart of `columnTracks`:
  `components/rowpanels/RowPanels.tsx` mounts one canvas column per record
  between the tree and the alignment, tiled by `blocksY`, and
  `renderRowPanel.ts` dispatches on the record's `kind` for the live view and
  the SVG export both. `rowPanelsWidth` comes out of `msaAreaWidth` in
  `model.ts`, which is what moves the alignment, the minimap and the tracks
  right by the panels; the headers take their own band in `TopArea` and export
  as a `rotate(-90)` text each. Row panels stay out of the track machinery,
  which is column space.

  `renderStrip.ts` draws the `strip` kind, a cell per row. `features` draws the
  GFF's spans per row through `components/msa/drawFeatureSpans.ts`, the one span
  mark: the alignment's overlay (`renderBoxFeatureCanvasBlock.ts`) and the panel
  each hand it an x mapping, the fills, the labels and a row geometry, so a
  strand arrow is drawn in one place. The head is the last `headLength` pixels
  _of_ the feature, tapering to a point at its end the way gggenes and gggenomes
  draw one, and a feature shorter than the head is all head. A glyph therefore
  covers its own span and nothing past it, which is what lets the genes of an
  operon butt together instead of biting triangles out of each other. A
  `headRise` lifts the head above a band too thin to taper, which the underline
  bar is. `resolvedRowPanels` resolves a panel's spans to panel pixels:
  `x: "column"` scales `domainBands` by `colWidth`, and `x: "position"` packs
  each row's features in residue positions through `packDomainLanes`, which is
  generic over `{startCol, endCol}`, and maps their extent onto the panel width.
  The packing runs on the pixel spans and shrinks each one by a tenth before
  testing overlap, because adjacent bacterial genes commonly share a few bases
  and a stop codon over the next start put a whole operon on two lanes. Both `x`
  modes hand their unlaned spans to `panelLanes`, which dispatches on the
  record's `position`: `strandpile` packs each strand on its own and lays every
  row out on one grid, sized by the deepest row on each side, so the line
  between the strands holds still down the panel. A `position` is a lane
  assignment and nothing else -- no mode of it reaches `drawFeatureSpans`. The
  `align` transform's per-row shift comes from `featureAlignShifts`. A record's
  own `encoding` resolves through `resolveScale` and `featureFields.ts` the way
  the top-level `featureFill` and `featureLabel` do, and falls back to them. A
  tree, a `gff` and a `features` panel make a figure with no alignment at all:
  `dataInitialized` is `msa || tree`, `numColumns` is 0, and the alignment panel
  is zero columns wide on screen and in the export.

- The tree overview (`components/tree/TreeOverview.tsx`,
  `renderTreeOverview.ts`) is the brush on the row scale, behind
  `showTreeOverview`. It draws `get tree()` rather than `root`, so the whole
  tree stays on screen while the view shows one subtree, and its height joins
  the `Math.max` of the top band in `msaAreaHeight`. `treeOverviewImage` caches
  the tree and the clade rectangles on an offscreen canvas, since a 230k-branch
  tree cannot be redrawn as the focus box follows the pointer, and the SVG
  export runs the same `renderTreeOverview` onto a svgcanvas Context.
- A `clades` record's `mark` picks what it draws. `highlight` fills the rows,
  `bracket` draws a bar with the record's `label`, and `collapse` and `focus`
  seed `collapsed` and `showOnly` once in `afterCreate`, so the collapse the
  tree, `hideGapsEffective` and the alignment all read is the one the branch
  menu writes. `cladeGutterWidth` in `components/tree/cladeBrackets.ts` is the
  column the bracket takes out of the right of the tree area, which the tip
  labels and the tree both give way to, so the bar lands between the labels and
  the first row panel. The canvas draws the bar and the label is DOM text
  (`CladeLabels.tsx`) on screen and a `<text>` in the export, since the canvas
  layer has no rotation.
- `treeAreaWidth` and `treeWidth` are undefined until a snapshot, a prop or the
  divider sets them, and undefined fits the tree area to the labels and the
  tree. Read `effectiveTreeAreaWidth` and `effectiveTreeWidth`. The fit measures
  the labels and the clade gutter at `labelFitFontSize` over the whole tree, so
  a zoom, a collapse or a focus leaves the alignment where it is, and the
  renderer ellipsizes a label that outgrows its room.
- `model.legends` is the one list both legend renderings read:
  `components/msa/AnnotationLegend.tsx` on screen and `LegendSVG` in
  `renderToSvg.tsx` for the export. A producer contributes
  `{ id, title, entries }`, and `legendRows` flattens the list into the rows
  both renderings stack top to bottom, giving each legend a title row once there
  is more than one. The domain overlay, the row-table encodings and the row
  panels are its producers, each keyed by its scale's declaration
  (`resolvedScales`), so a matrix of strips naming one `legend.title` lists one
  legend. A channel nests `scale: {type, domain, range, scheme}` and
  `legend: {title}`, as jbrowse-components' displays do since its ADR-238. A
  `snapshotProcessor` on `encodings`, `rowPanels` and `columnTracks` lifts the
  earlier spellings (flat `domain`/`range`/`title`, a palette name in `range`,
  `scale: {palette}`, `{map}`, `legend` strings, `colors`, `max`,
  `scales.y.domainMax`, a features panel's `color` and `label`) on the way in,
  so no stored record has them. The property behind the overlay's collapse
  toggle stays `showDomainLegend`, because that name travels in the shared URL.
- The viewer calls no remote compute queue and runs no analysis long enough to
  freeze the tab. The one exception is neighbor joining, capped at
  `maxNeighborJoiningRows`, because on a small alignment it is faster than
  installing an aligner. A new analysis is a tutorial plus a snapshot layer
  (`docs/layers.md`), not a menu item; see `viewer-not-analysis-tool`.
- The alignment background on screen comes from `components/msa/msaRaster.ts`:
  one pixel per cell, built lazily in 512-pixel tiles and blitted with
  `drawImage`, so a zoom frame costs a few blits instead of a `fillRect` per
  visible cell. The cache keys on every input to a cell's color. The tile map
  inside it also keys on the cells-per-pixel span, per axis: below one device
  pixel per cell a tile averages cells into a pixel, the browser's smoothing
  blurs both axes, and at fit-to-width only the columns are narrow.
  `MSACanvasBlock` decides whether the raster applies and passes `rasterTiles`
  to `renderMSABlock`. The SVG export draws the same background as one `<image>`
  (`rasterImageHref`) where a canvas can be read back, and falls back to
  per-cell rects where it cannot (jsdom). Letters stay `fillText`, since a glyph
  sprite atlas measured 2-3x slower.
- `contrastTextFn(theme)` in `util.ts` picks a letter's color from the
  background of the cell it lands on, memoized per theme. A dynamic scheme has
  no letter->color table to precompute from, and a text track has its own
  `colors`.
- The minimap bar draws the same raster sampled down to at most 2000 columns.
- Blocks are positioned at their offsets only; `scrollX`/`scrollY` live on one
  transformed container per panel (`MSACanvas`, `TreeCanvas`, `TrackBlocks`).
  Anything `position: fixed` inside those containers has to be portaled, since a
  transformed ancestor becomes its containing block.
- Node ids are path-derived from `tree`, which is `inputTree` after `treeRoot`
  reroots it (`rerootTree.ts`). `collapsed`, `rotated` and `showOnly` hold those
  ids, so `setTreeRoot` clears all three and the seeding clade marks apply
  again. `treeRoot` names tips, so it survives a reload of the same tree.
  `buildTreeRoot` sorts each node's children by `treeOrder`, then reverses the
  `rotated` ones. `rerootTree.ts` imports nothing and works on the plain
  `parseNewick` node, so it can move into `@gmod/newick`, which the
  jbrowse-components tree sidebar also uses.
- `hierarchy.ts` no longer implements the tree traversals. They live in
  `@gmod/newick` now, shared with the tree sidebar in jbrowse-components, and
  the file is a typing shim that re-exports them plus this viewer's own layout
  helpers. There is no d3 dependency.
- `packages/svgcanvas` implements only the calls the renderers make: rectangles,
  paths, arcs and glyphs. It dropped gradients, patterns, clipping, rotation,
  bezier curves, stroked text, shadows and `drawImage`, and it omits attributes
  whose value equals the SVG default (`stroke="none"` on a fill, an empty
  `stroke-dasharray`, a matrix transform duplicating x/y). Adding a renderer
  call means adding it there. `renderToSvg` splices each layer's serialized
  markup into the React page as a string, so React never parses it.
- Tracks (conservation, sequence logo, the position ruler, the Stockholm text
  tracks, the pinned copy of the `relativeTo` row) carry a `kind` discriminator
  and share one draw module, `components/tracks/drawTracks.ts`. `drawTrackBlock`
  there applies the transform and dispatches on `kind`. The live view calls it
  from `components/tracks/TrackBlocks.tsx`, the canvas host for every kind, and
  the SVG export calls it through `renderAllTracks`. Adding a track kind means a
  new `kind`, a draw function in that module, a case in `drawTrackBlock`, and a
  case in `components/tracks/TrackTooltipContent.tsx` for that track's reading
  at the hovered column, with no second rendering path or component.
  `components/Track.tsx` hosts every kind's hover: `useTrackHover` there sets
  the model's mouse column and anchors the tooltip, so the column statistics
  live on the tracks that draw them and the alignment's own tooltip stays about
  the cell under the cursor. A track model carries a `heightKey` naming the
  height its divider writes: the `kind` for a computed track, so conservation
  and property conservation resize together, and `own:<id>` for a `columnTracks`
  track, which resizes alone. `trackHeights` holds one number per key, absent
  until the user drags, and `defaultTrackHeights` answers until then. A track
  without a key -- the ruler, a text track -- has no divider. Only the last
  turned-on track of a key carries the handle, and the drag divides across the
  group, so the group's bottom edge follows the cursor. That handle covers only
  the alignment, so `Track` draws a hairline under every track but the last,
  which reaches across the labels too.
- `turnedOffTracks` records only the user's explicit show/hide choices. An id is
  absent until they touch that track, and the value then means "off", so a
  hidden-by-default track (see `defaultOffTracks` in `model.ts`) adds nothing to
  the shared URL.
- `@jbrowse/core` is an **external** in the downstream jbrowse-plugin-msaview
  UMD build. The bundle resolves it at runtime against the core the host
  jbrowse-web ships, which is often much older than the one in this workspace.
  Importing a freshly added core export therefore typechecks and passes tests
  here but is `undefined` on a deployed host (`TypeError: X is not a function`).
  Prefer long-established core exports; when a new one is a trivial helper,
  inline it (see `statusMessageText` in `packages/lib/src/fetchUtils.ts`).

  Core can also drop a long-established export, and a bundle that built and
  booted then throws the first time a user reaches the code that reads it. Core
  removed `renderToStaticMarkup` from the `@jbrowse/core/util` barrel to keep
  react-dom out of the RPC worker. Only the SVG export called it, so
  jbrowse-plugin-msaview 3.4.0 and -tview 2.2.1 loaded normally and failed on
  export; `packages/lib/src/renderToStaticMarkup.ts` now inlines it. **Check
  every core import whose only caller is off the boot path by hand.** This
  repo's tests do not reach it, and the downstream plugin's host-compat probe
  asserts only that the app boots and the plugin global is defined.

## Key entry points

- `packages/lib/src/model.ts`: the main MsaView state model (properties,
  actions, getters, autoruns)
- `packages/lib/src/components/MSAViewer.tsx`: zero-config declarative wrapper
- `packages/lib/src/components/Loading.tsx`: exported as MSAView, handles
  loading/import states
- `packages/lib/src/components/msa/renderMSABlock.ts`: core MSA canvas rendering
- `packages/lib/src/components/tree/renderTreeCanvas.ts`: tree canvas rendering
- `packages/lib/src/index.ts`: public API exports (MSAView, MSAViewer,
  MSAModelF)
