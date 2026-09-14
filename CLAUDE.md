## Project overview

react-msaview (JBrowseMSA) is an interactive multiple sequence alignment viewer.
It renders phylogenetic trees alongside protein/DNA alignments using HTML5
canvas with a tiled rendering system for scalability.

## Key packages

- `packages/lib` — main React component library (the core viewer)
- `packages/app` — demo app deployed at gmod.org/JBrowseMSA
- `packages/cli` — domain/exon GFFs (InterPro precomputed matches, InterProScan,
  RefSeq exon models) and headless SVG export. The only path to a domain file
  now that the viewer no longer scans
- `packages/msa-parsers` — parsers for Stockholm, FASTA, Clustal, Newick, EMF,
  A3M, GFF
- `packages/examples` — the live examples the website's /examples page mounts.
  `src/examples/catalog.ts` is the single source for what each example is (the
  gallery page reads its captions from there), and `data/` holds the alignments,
  trees and GFFs as files, which `writeExampleData.mjs` copies into the app
- `packages/svgcanvas` — vendored ESM fork of svgcanvas for SVG export
- `packages/r-msaview` — R htmlwidget package with ggtree/Biostrings/treeio
  interop

## Tutorials

`docs/tutorials/*.md` are reader-facing walkthroughs of the work that happens
**outside** the viewer: sequences to alignment to tree to annotations, ending on
a `?data=` URL that opens the result. A tutorial is one continuous line of work
— each step consumes what the step before produced — and every command in it has
been run, with the real numbers in the prose. The whole pipeline also lives in
`docs/tutorials/scripts/build_<topic>.sh`, which `## Reproduce it end to end`
curls.

Adding one means a file there plus an entry in `website/src/lib/tutorials.ts`;
`website/src/pages/tutorials/[slug].astro` globs the directory and `index.astro`
reads the list. Prefer a tutorial over a viewer feature whenever the work is
data preparation — see `viewer-not-analysis-tool` in the memory and
`agent-docs/ideas/data-layers.md`.

## Architecture decisions

- `packages/lib/src/model.ts` is a large MST model (~2000 lines). Do not attempt
  to modularize or split it into smaller files. Inline changes within the file
  are fine.
- The viewer uses MobX-state-tree for state management. Components use
  `observer` from mobx-react to reactively re-render.
- Canvas rendering uses a tiled block system (`calculateBlocks.ts`) to avoid
  rendering entire large alignments at once.
- Domain **visualization** is a core feature — do not remove it. That means the
  GFF path: `Annotations → Open annotation file...` (GFF3 as the CLI writes it,
  or an InterProScan JSON response, converted to GFF on the way in), the
  overlay, the legend, the filter dialog, `annotationsByRow`. The dialog lands
  its file in `data.gff`, so the annotations travel in the snapshot and the
  shared URL like every other layer. Producing the file is not the viewer's job
  and no longer happens here — the tab used to submit the alignment to the EBI
  iprscan5 queue and poll it for fifteen minutes, and
  `react-msaview-cli interpro` answers from precomputed matches in seconds.
- Nothing in the viewer waits on a remote compute queue, and nothing runs an
  analysis that would freeze the tab. Neighbor joining is the edge: it stays,
  capped at `maxNeighborJoiningRows`, because on a small alignment it is faster
  than installing an aligner. The general rule is `viewer-not-analysis-tool` — a
  new analysis is a tutorial plus a snapshot layer (`docs/layers.md`), not a
  menu item.
- The alignment background on screen comes from `components/msa/msaRaster.ts`:
  one pixel per cell, built lazily in 512-pixel tiles and blitted with
  `drawImage`, so a zoom frame costs a few blits instead of a `fillRect` per
  visible cell. The cache keys on everything a cell's color depends on; the tile
  map inside it keys on that plus the cells-per-pixel span, since below a device
  pixel per cell a tile averages cells into a pixel — per axis, because the
  browser's own smoothing blurs both and at fit-to-width only the columns are
  narrow. `MSACanvasBlock` decides whether the raster applies and tells
  `renderMSABlock` via `rasterTiles`; the SVG export draws the same background
  as one `<image>` (`rasterImageHref`) wherever a canvas reads back, and falls
  back to the per-cell rect path where none does (jsdom). Letters stay
  `fillText` — a glyph sprite atlas measured 2-3x slower.
- A letter's color is a question about the cell it lands on, not about the
  letter: `contrastTextFn(theme)` in `util.ts` answers it, memoized per theme. A
  dynamic scheme has no letter->color table to precompute from, and a text track
  has its own `colors`.
- The minimap bar draws the same raster sampled down to at most 2000 columns.
- Blocks are positioned at their offsets only; `scrollX`/`scrollY` live on one
  transformed container per panel (`MSACanvas`, `TreeCanvas`, `TrackBlocks`).
  Anything `position: fixed` inside those containers has to be portaled, since a
  transformed ancestor becomes its containing block.
- `hierarchy.ts` no longer implements the tree traversals. They live in
  `@gmod/newick` now, shared with the tree sidebar in jbrowse-components, and
  the file is a typing shim that re-exports them plus this viewer's own layout
  helpers. There is no d3 dependency.
- `packages/svgcanvas` is cut down to the calls the renderers make — rectangles,
  paths, arcs, glyphs. Gradients, patterns, clipping, rotation, bezier curves,
  stroked text, shadows and `drawImage` are gone, and so is every attribute svg
  already assumes (`stroke="none"` on a fill, an empty `stroke-dasharray`, a
  matrix transform saying what x/y say). Adding a renderer call means adding it
  there. `renderToSvg` splices each layer's serialized markup into the React
  page as a string rather than handing it back to React to parse.
- Tracks (conservation, sequence logo, the position ruler, the Stockholm text
  tracks) carry a `kind` discriminator and share one draw module,
  `components/tracks/drawTracks.ts`. `drawTrackBlock` there owns the transform
  and dispatches on `kind`; the live view calls it from
  `components/tracks/TrackBlocks.tsx`, the one canvas host every kind uses, and
  the SVG export calls it through `renderAllTracks`. Adding a track kind means a
  new `kind`, a draw function in that module, and a case in `drawTrackBlock` —
  not a second rendering path or a second component. `TrackResizeHandle` writes
  a kind's shared volatile height, except for a `columnTracks` track, which
  carries its own.
- `turnedOffTracks` records only the user's explicit show/hide choices. An id is
  absent until they touch that track, and the value then means "off", so a
  hidden-by-default track (see `defaultOffTracks` in `model.ts`) adds nothing to
  the shared URL.
- `@jbrowse/core` is an **external** in the downstream jbrowse-plugin-msaview
  UMD build — it is not bundled, it resolves at runtime against whatever core
  the host jbrowse-web ships, which is often much older than the one in this
  workspace. Importing a freshly-added core export therefore typechecks and
  tests green here but lands as `undefined` on a deployed host
  (`TypeError: X is not a function`). Prefer long-established core exports; when
  a new one is a trivial helper, inline it instead (see `statusMessageText` in
  `packages/lib/src/fetchUtils.ts`). The risk runs the other way too, and
  "long-established" is not a defence: core can _drop_ an export, and then a
  bundle that built and booted fine throws the first time a user reaches the
  code path that reads it. That is what happened to `renderToStaticMarkup`,
  which core removed from the `@jbrowse/core/util` barrel to keep react-dom out
  of the RPC worker; only the SVG export called it, so jbrowse-plugin-msaview
  3.4.0 and -tview 2.2.1 shipped and loaded normally and broke on export. It is
  now inlined in `packages/lib/src/renderToStaticMarkup.ts`. **A core import
  whose only caller is off the boot path is the dangerous shape** — nothing here
  or in the downstream plugin's host-compat probe, which asserts only that the
  app boots and the plugin global is defined, can see it.

## Key entry points

- `packages/lib/src/model.ts` — the main MsaView state model (properties,
  actions, getters, autoruns)
- `packages/lib/src/components/MSAViewer.tsx` — zero-config declarative wrapper
- `packages/lib/src/components/Loading.tsx` — exported as MSAView, handles
  loading/import states
- `packages/lib/src/components/msa/renderMSABlock.ts` — core MSA canvas
  rendering
- `packages/lib/src/components/tree/renderTreeCanvas.ts` — tree canvas rendering
- `packages/lib/src/index.ts` — public API exports (MSAView, MSAViewer,
  MSAModelF)
