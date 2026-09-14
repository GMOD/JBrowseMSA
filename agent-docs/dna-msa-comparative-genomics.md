# Handoff: DNA-MSA figure + comparative-genomics roadmap

This doc supports the Apollo renewal. The goal is a figure of JBrowse's MSA
viewer, with its tree, in a combined JBrowse view that also shows a gene
annotation track, ideally over a DNA alignment. The figure argues that _we
already have an MSA viewer, so an MSA **editor** (for automated annotation
liftover across many species) is a short step._ This doc records what was
built, the strategy, and the next workstreams.

## Argument for the editor

The liftover _projection math already exists_ in this repo: `genestructure`
(packages/cli/src/genestructure.ts) maps a reference gene's exons to alignment
columns, then projects those columns into every other species' own coordinates.
An interactive editor adds one step to that read-only projection: drag an exon
boundary on one species, recompute through the columns, and write the result
back. Lead with this point: the editor is incremental UI on existing coordinate
code.

## Two levels of comparative annotation

Each level loosens the coordinate model:

- **Level 1: column-locked MSA** (react-msaview). Every species shares columns,
  which suits base-level editing and liftover within an aligned gene or region.
  This level is the **MSA editor** (the grant).
- **Level 2: synteny / graph** (gggenomes / pangenome). Species share no columns;
  links, ribbons or graph edges show relationships, including rearrangements and
  annotation on alternate paths.

---

## Workstream 1: F12 combined figure (done, proof of concept)

The figure is a real single JBrowse session. The top panel is a
`LinearGenomeView` of the F12 locus with the RefSeq/MANE **gene annotation
track**. Below it is the react-msaview **MsaView**, with the DNA CDS alignment,
the species tree and the 14-exon model projected across every species. The
session has **no MAF track**, because a MAF track and the MsaView would show the
same alignment twice.

- Generator: `scripts/screenshots/f12-combined-figure.mjs` (`--force` to
  rewrite).
- Output: `docs/media/f12-combined-closeup.png`, at base resolution on the shared
  cetacean frameshift, where beluga/porpoise/dolphin/minke_whale show `-` and
  every other mammal has `C`. We dropped a zoomed-out overview variant once no
  page referenced it or its generated session URL.
- The generator inlines data from `packages/app/public/data/f12-cetacean-cds.stock`
  and `f12-cetacean-exons.gff`, so the session URL is self-contained.

### Technical notes that cost time

- An `encoded-` (raw MST snapshot) session URL must put **both** `config` and
  `session` in the **hash** (`#config=...&session=encoded-...`). Mixing
  query-config with hash-session, or top-level `assembly/loc/tracks` on the LGV,
  fails union matching.
- The LGV snapshot uses `init: { assembly, loc, tracks }` (resolved by the main
  build's afterAttach), with `colorByCDS` top-level.
- MsaView accepts inline `data: { msa, tree, gff }` plus native snapshot props:
  `colorSchemeName`, `colWidth`, `rowHeight`, `height`, `scrollX`,
  `treeAreaWidth`, `labelsAlignRight`, `highlightColumns`. (`scrollX` is a
  negative px offset; `colWidth` < 1 is allowed for the fit-all overview.)
- The F12 reference row is named `human`; the shared frameshift is alignment
  column `205`; the gene is chr5:177,401,800-177,409,900, minus strand,
  NM_000505.4.

### Known gap: publication-grade follow-up

The figures render against the **published** MsaView plugin. That release
predates this repo's palette fix (early exons are pink-heavy) and draws the
column highlight under the exon fill. The known-good
`docs/media/f12-exon-architecture.png` (from the standalone app, current repo
code) shows the corrected distinct colors. For a publication-grade combined
figure, render against a locally rebuilt plugin:

- local jbrowse-web build: `~/src/jbrowse-components/products/jbrowse-web/build`
  (branch `webgl-poc-layout-offload`)
- local plugin dist: `~/src/jb2plugins/jbrowse-plugin-msaview/dist`
- pattern to copy: `scripts/screenshots/jbrowse-figures.mjs` already supports
  `--jbrowse-url` + `--plugin-dist` + a locally rewritten config. Serve the
  plugin dist and data, rewrite the config's plugin URL to local, and point
  `JBROWSE_WEB_URL` at the local build.
- Caveat: build the plugin dist against _this branch's_ react-msaview so it
  includes the palette fix (memory: palette fix is unreleased).

---

## Workstream 2: gggenomes-style synteny view (design, not started)

The proposal is a sibling view to the MSA that is **not column-locked**. It draws
per-genome gene arrows, extending the existing gene-arrow map (`drawGeneArrow` in
packages/lib/src/components/msa/renderBoxFeatureCanvasBlock.ts), plus a layer of
links or ribbons between adjacent genomes: a parallelogram for direct synteny
and a twisted ribbon for an inversion (cf. gggenomes, whose tracks borrow from
ggtree/ggraph/gggenes).

- Data model: sequences (one row per genome), features (genes per genome) and
  **links** (synteny blocks between adjacent genome pairs). Do NOT force the data
  into MSA columns; the view exists to show gene-order conservation and
  rearrangements, which a fixed-column MSA cannot draw.
- This view leads toward pangenome visualization, since a graph is roughly many
  genomes plus links. Pangenome linearization is hard; the valuable target is
  annotating gene structure on alternate paths. Treat that as research, and
  build the multi-genome and links view first.

---

## Key files

- `packages/lib/src/model.ts`: MsaView model. `data.gff` autorun (~L1886),
  `scrollX`/`colWidth`/`highlightColumns` props, `seqPosToVisibleCol` /
  `visibleColToSeqPos` coordinate APIs.
- `packages/lib/src/components/msa/renderBoxFeatureCanvasBlock.ts`: box/exon and
  `drawGeneArrow` rendering (column-aligned overlay).
- `packages/cli/src/genestructure.ts`: reference→column→per-row exon projection
  (the liftover math).
- `website/src/lib/geneExplorer.ts`: combined-session builder
  (`encodedSessionUrl`, `linearGenomeView`/`msaView`/`connectedFeature`).
- `packages/app/public/data/jbrowse-msa-combined-config.json`: hg38 assembly,
  RefSeq tracks, `multiz470way` MAF track and the MsaView/Protein3d plugins.
- `~/src/jb2plugins/jbrowse-plugin-msaview/src/LaunchMsaViewExtensionPoint/index.ts`:
  the MsaView session-field surface.
- `~/src/jbrowse-components/plugins/maf/src/LinearMafDisplay` +
  `LinearMafRenderer`: MAF display and renderer, with a Newick tree sidebar and
  no annotation overlay.
- Figure scripts: `scripts/screenshots/f12-combined-figure.mjs` (combined view),
  `f12-genome-figure.mjs` (LGV + MAF), `jbrowse-figures.mjs` (connected
  genome+MSA+3D, local-build harness).
