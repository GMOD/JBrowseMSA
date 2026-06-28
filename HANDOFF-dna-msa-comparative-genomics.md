# Handoff: DNA-MSA figure + comparative-genomics roadmap

Context for the Apollo renewal: produce a figure of JBrowse's MSA viewer (tree
beside it) in a combined JBrowse view that also shows a gene annotation track —
ideally a DNA alignment — to argue that _we already have an MSA viewer, so an
MSA **editor** (for automated annotation liftover across many species) is a
short step._ This doc captures what was built, the strategy, and the next
workstreams.

## The thesis the work should keep proving

The liftover _projection math already exists_ in this repo: `genestructure`
(packages/cli/src/genestructure.ts) maps a reference gene's exons to alignment
columns, then projects those columns into every other species' own coordinates.
A read-only projection is one step from an interactive editor (drag an exon
boundary on one species → recompute via the columns → write back). Lead with
this: the editor is incremental UI on existing coordinate machinery.

## Strategic frame — three rungs of comparative annotation

Loosening the coordinate model as you climb:

- **Rung 1 — column-locked MSA** (react-msaview): every species shares columns;
  ideal for base-level editing + liftover within an aligned gene/region → the
  **MSA editor** (the grant).
- **Rung 2 — synteny / graph** (gggenomes / pangenome): no shared columns;
  relationships are links/ribbons/graph edges; rearrangements + alt-path
  annotation.

---

## Workstream 1 — F12 combined figure ✅ DONE (proof of concept)

A real single JBrowse session: top = `LinearGenomeView` of the F12 locus with
the RefSeq/MANE **gene annotation track**; below = the react-msaview **MsaView**
(DNA CDS alignment + species tree + the 14-exon model projected across every
species). **No MAF track** — a MAF track + the MsaView would show the same
alignment twice (one alignment representation, the on-message one).

- Generator: `scripts/screenshots/f12-combined-figure.mjs` (`--force` to
  rewrite).
- Outputs: `docs/media/f12-combined-overview.png` (exon architecture across the
  tree) and `docs/media/f12-combined-closeup.png` (base resolution at the shared
  cetacean frameshift: beluga/porpoise/dolphin/minke_whale show `-` where every
  other mammal has `C`).
- Data inlined from `packages/app/public/data/f12-cetacean-cds.stock` +
  `f12-cetacean-exons.gff`, so the session URL is self-contained.

### Technical notes that cost time (don't relearn)

- `encoded-` (raw MST snapshot) session URL must put **both** `config` and
  `session` in the **hash** (`#config=...&session=encoded-...`). Mixing
  query-config with hash-session, or top-level `assembly/loc/tracks` on the LGV,
  fails union matching.
- LGV snapshot uses `init: { assembly, loc, tracks }` (resolved by the webgl-poc
  build's afterAttach), with `colorByCDS` top-level.
- MsaView accepts inline `data: { msa, tree, gff }` plus native snapshot props:
  `colorSchemeName`, `colWidth`, `rowHeight`, `height`, `scrollX`,
  `treeAreaWidth`, `labelsAlignRight`, `highlightColumns`. (`scrollX` is a
  negative px offset; `colWidth` < 1 is allowed for the fit-all overview.)
- F12 reference row is named `human`; the shared frameshift is alignment column
  `205`; gene is chr5:177,401,800-177,409,900, minus strand, NM_000505.4.

### Known gap → publication-grade follow-up

The figures render against the **published** MsaView plugin, which predates this
repo's palette fix (early exons are pink-heavy) and draws the column highlight
under the exon fill. The known-good `docs/media/f12-exon-architecture.png` (from
the standalone app, current repo code) shows the corrected distinct colors. To
get a publication-grade combined figure, render against a locally-rebuilt
plugin:

- local jbrowse-web build: `~/src/jbrowse-components/products/jbrowse-web/build`
  (branch `webgl-poc-layout-offload`)
- local plugin dist: `~/src/jb2plugins/jbrowse-plugin-msaview/dist`
- pattern to copy: `scripts/screenshots/jbrowse-figures.mjs` already supports
  `--jbrowse-url` + `--plugin-dist` + a locally-rewritten config; serve the
  plugin dist + data, rewrite the config's plugin URL to local, point
  `JBROWSE_WEB_URL` at the local build.
- Caveat: the plugin dist must be built against _this branch's_ react-msaview to
  include the palette fix (memory: palette fix is unreleased).

---

## Workstream 2 — gggenomes-style synteny view 📋 DESIGN (not started)

A sibling view to the MSA, **not column-locked**. Per-genome gene arrows (extend
the existing gene-arrow-map: `drawGeneArrow` in
packages/lib/src/components/msa/renderBoxFeatureCanvasBlock.ts) + a
links/ribbons layer between adjacent genomes (direct synteny = parallelogram,
inverted = twisted ribbon; cf. gggenomes, whose tracks borrow from
ggtree/ggraph/gggenes).

- Data model: sequences (one row per genome) + features (genes per genome) +
  **links** (synteny blocks between adjacent genome pairs). Do NOT force into
  MSA columns — the value is showing gene-order conservation / rearrangements
  that a fixed-column MSA cannot.
- This is the stepping-stone toward pangenome viz (a graph ≈ many genomes +
  links). Pangenome linearization is hard; the valuable target is annotating
  gene structure on alternate paths — treat as research/vision, build the
  multi-genome+links view solid first.

---

## Key files

- `packages/lib/src/model.ts` — MsaView model. `data.gff` autorun (~L1886),
  `scrollX`/`colWidth`/`highlightColumns` props, `seqPosToVisibleCol` /
  `visibleColToSeqPos` coordinate APIs.
- `packages/lib/src/components/msa/renderBoxFeatureCanvasBlock.ts` — box/exon +
  `drawGeneArrow` rendering (column-aligned overlay).
- `packages/cli/src/genestructure.ts` — reference→column→per-row exon projection
  (the liftover math).
- `website/src/lib/geneExplorer.ts` — combined-session builder
  (`encodedSessionUrl`, `linearGenomeView`/`msaView`/`connectedFeature`).
- `packages/app/public/data/jbrowse-msa-combined-config.json` — hg38 assembly +
  RefSeq tracks + `multiz470way` MAF track + MsaView/Protein3d plugins.
- `~/src/jb2plugins/jbrowse-plugin-msaview/src/LaunchMsaViewExtensionPoint/index.ts`
  — the MsaView session-field surface.
- `~/src/jbrowse-components/plugins/maf/src/LinearMafDisplay` +
  `LinearMafRenderer` — MAF display/render; has a Newick tree sidebar already;
  no annotation overlay.
- Figure scripts: `scripts/screenshots/f12-combined-figure.mjs` (new, combined
  view), `f12-genome-figure.mjs` (LGV + MAF), `jbrowse-figures.mjs` (connected
  genome+MSA+3D, local-build harness).
