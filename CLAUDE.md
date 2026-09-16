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
  domains, so the CLI is the only way to produce a domain file
- `packages/msa-parsers`: parsers for Stockholm, FASTA, Clustal, Newick, EMF,
  A3M, GFF
- `packages/examples`: the live examples the website's /examples page mounts.
  `src/examples/catalog.ts` holds each example's name, category and description,
  and `data/` holds the alignments, trees and GFFs as files, which
  `scripts/screenshots/writeExampleData.mjs` copies into the app
- `packages/svgcanvas`: vendored ESM fork of svgcanvas for SVG export
- `packages/r-msaview`: R htmlwidget package with ggtree/Biostrings/treeio
  interop. `R/msaview.R` is the one function taking every prop as an argument,
  and `R/layers.R` is the same surface composed with `+`, the way ggplot2 and
  ggtree add a geom. A layer is a `set`/`append` pair over the props, applied by
  `+.msaview`, so a layer adds no prop of its own and the embed-API parity check
  reads `msaview.R` alone. `msa` and `tree` stay arguments; every other argument
  has a layer, which `test-layer-coverage.R` checks
- `packages/python`: the `msaview-widget` anywidget (import `msaview`). Its
  traits are the `MSAViewer` props in snake case, and `src/render.ts` maps them
  onto `mount()`. The built `msaview/static/widget.js` is gitignored and shipped
  in the wheel

## Tutorials

`docs/tutorials/*.md` are reader-facing walkthroughs of the data preparation
done outside the viewer: sequences to alignment to tree to annotations, ending
on a `?data=` URL that opens the result. Each step of a tutorial consumes what
the step before produced. Every command in it has been run, and the prose quotes
the numbers it printed. `docs/tutorials/scripts/build_<topic>.sh` runs the whole
pipeline, and the `## Reproduce it end to end` section curls it.

Adding one means a file there plus an entry in `website/src/lib/tutorials.ts`;
`website/src/pages/tutorials/[slug].astro` globs the directory and `index.astro`
reads the list. Write a tutorial instead of a viewer feature whenever the work
is data preparation. See `viewer-not-analysis-tool` in the memory and
`agent-docs/ideas/data-layers.md`.

The index is the site's gallery, and it is cards only — every piece of content
under `/tutorials` is a page of its own. Each entry names a `thumb`, one of that
page's own figures, which astro:assets crops to 5:3 and re-encodes at build
time, so a card cannot drift from its page and no thumbnail file lands in
`docs/media`.

`tutorials/jbrowse_integration.astro` is the one carded page with no markdown
behind it: it holds the connected JBrowse 2 sessions, whose content is the
generated URLs in `lib/jbrowseLinks.ts` and `lib/f12CombinedLinks.ts`, thousands
of percent-encoded characters each. `[slug].astro` builds only slugs the
markdown glob produces, so a hand-written page at a `/tutorials/<name>` route
never collides with it.

There is no second showcase page: the standalone figure wall at `/gallery` was a
static copy of what `/examples` runs live and the tutorials build, so it is gone
and `/gallery` redirects to the index. `docs/media` holds only what a rendered
page shows; a figure that stops being shown loses its screenshot spec too.

Figure bytes live in `s3://jbrowse.org/msaview-figures/`, not in git, and
`media.lock` tracks one content-addressed line per file. `docs/media` is
gitignored apart from the ten figures the published READMEs link by relative
path, so **regenerating a figure leaves `git status` clean** and the bytes reach
anyone else only through `pnpm media:push`. Every script that reads the
directory pulls first. `scripts/media-store/README.md` carries the design and
the numbers behind it.

## Architecture decisions

- `packages/lib/src/model.ts` is a large MST model (~2000 lines). Do not attempt
  to modularize or split it into smaller files. Inline changes within the file
  are fine.
- The viewer uses MobX-state-tree for state management. Components use
  `observer` from mobx-react to reactively re-render.
- Canvas rendering uses a tiled block system (`calculateBlocks.ts`) to avoid
  rendering entire large alignments at once.
- Domain **visualization** is a core feature; do not remove it. That means the
  GFF path: `Annotations → Open annotation file...` (GFF3 as the CLI writes it,
  or an InterProScan JSON response, converted to GFF on the way in), the
  overlay, the legend, the filter dialog, `annotationsByRow`. The dialog stores
  its file in `data.gff`, so the annotations travel in the snapshot and the
  shared URL like every other layer. The viewer does not produce the file.
  `react-msaview-cli interpro` builds it from precomputed matches in seconds,
  where the EBI iprscan5 queue the viewer used to submit to took fifteen
  minutes. A span takes its color from its own GFF `color=` attribute first,
  then from a `featureFill` encoding's scale over a field of the feature table,
  then from `fillPalette` where no encoding is set and grey where one is, and
  `model.featureColors` resolves that once per change of the features, the
  encodings or the palette. A `featureLabel` encoding names the field
  `renderBoxFeatureCanvasBlock` draws inside each span wherever the text fits.
- The color scheme is a categorical scale over residue letters, and the public
  `residueEncoding` prop names the channel it paints: `fill` colors the cell,
  `color` colors the letter. The MST property behind it stays `bgColor`, because
  that name travels in the shared URL. The vocabulary is the one
  jbrowse-components uses for `LinearMarkDisplay` (marks, encodings, channels,
  scales); name new public API to match.
- A domain box and the scale contend for the same channel, so `domainUnderline`
  in `model.ts` decides who gets it. Under `residueEncoding: 'color'` with the
  letters big enough to draw, the overlay gives up its fill and marks each span
  with a `domainUnderlineHeight` bar along the bottom of the row. A filled box
  wins the row back wherever the letters cannot carry the scale: sub-row layout,
  which stacks its boxes clear of the letters anyway, and zoomed out past
  `minLetterRowHeight`, where the box is the only thing left to read.
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
  labels and the `treeWidth` autorun both give way to, so the bar lands between
  the labels and the first row panel. The canvas draws the bar and the label is
  DOM text (`CladeLabels.tsx`) on screen and a `<text>` in the export, since the
  canvas layer has no rotation.
- `model.legends` is the one list both legend renderings read:
  `components/msa/AnnotationLegend.tsx` on screen and `LegendSVG` in
  `renderToSvg.tsx` for the export. A producer contributes
  `{ id, title, entries }`, and `legendRows` flattens the list into the rows
  both renderings stack top to bottom, giving each legend a title row once there
  is more than one. The domain overlay, the row-table encodings and the row
  panels are its producers, each keyed by the field its scale reads. A strip's
  `legend` overrides that key, so a matrix of columns over one set of colors
  lists one legend. The property behind the overlay's collapse toggle stays
  `showDomainLegend`, because that name travels in the shared URL.
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
  tracks) carry a `kind` discriminator and share one draw module,
  `components/tracks/drawTracks.ts`. `drawTrackBlock` there applies the
  transform and dispatches on `kind`. The live view calls it from
  `components/tracks/TrackBlocks.tsx`, the canvas host for every kind, and the
  SVG export calls it through `renderAllTracks`. Adding a track kind means a new
  `kind`, a draw function in that module, a case in `drawTrackBlock`, and a case
  in `components/tracks/TrackTooltipContent.tsx` for that track's reading at the
  hovered column, with no second rendering path or component.
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
