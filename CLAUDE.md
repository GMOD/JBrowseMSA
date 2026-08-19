## Project overview

react-msaview (JBrowseMSA) is an interactive multiple sequence alignment viewer.
It renders phylogenetic trees alongside protein/DNA alignments using HTML5
canvas with a tiled rendering system for scalability.

## Key packages

- `packages/lib` — main React component library (the core viewer)
- `packages/app` — demo app deployed at gmod.org/JBrowseMSA
- `packages/cli` — CLI for batch InterProScan queries against EBI API
- `packages/msa-parsers` — parsers for Stockholm, FASTA, Clustal, Newick, EMF,
  A3M, GFF
- `packages/svgcanvas` — vendored ESM fork of svgcanvas for SVG export
- `packages/r-msaview` — R htmlwidget package with ggtree/Biostrings/treeio
  interop

## Architecture decisions

- `packages/lib/src/model.ts` is a large MST model (~2000 lines). Do not attempt
  to modularize or split it into smaller files. Inline changes within the file
  are fine.
- The viewer uses MobX-state-tree for state management. Components use
  `observer` from mobx-react to reactively re-render.
- Canvas rendering uses a tiled block system (`calculateBlocks.ts`) to avoid
  rendering entire large alignments at once.
- InterProScan domain visualization is a core feature — do not remove it.
- `hierarchy.ts` no longer implements the tree traversals. They live in
  `@gmod/newick` now, shared with the tree sidebar in jbrowse-components, and
  the file is a typing shim that re-exports them plus this viewer's own layout
  helpers. There is no d3 dependency.
- Tracks (conservation, sequence logo, the Stockholm text tracks) carry a `kind`
  discriminator and share one draw module, `components/tracks/drawTracks.ts`.
  `drawTrackBlock` there owns the transform and dispatches on `kind`; the live
  view calls it from `components/tracks/TrackBlocks.tsx`, the one canvas host
  every kind uses, and the SVG export calls it through `renderAllTracks`.
  Adding a track kind means a new `kind`, a draw function in that module, and a
  case in `drawTrackBlock` — not a second rendering path or a second component.
  `TrackResizeHandle` maps a kind to the model volatile holding its height.
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
  `packages/lib/src/fetchUtils.ts`).

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
