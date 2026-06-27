# Handoff: Gene Explorer three-way linked hover (genome ↔ MSA ↔ 3D structure)

Status as of 2026-06-27. Spans three repos:

- `~/src/react-msaview` — the website + gene explorer (`packages/website`) + the
  alignment build (`scripts/gene-explorer`)
- `~/src/jb2plugins/jbrowse-plugin-msaview` — the MSA view JBrowse plugin
- `~/src/jb2plugins/jbrowse-plugin-protein3d` — the 3D structure JBrowse plugin

The gene explorer's "Open in JBrowse" builds a declarative JBrowse session spec
(`packages/website/src/lib/geneExplorer.ts` → `buildSessionSpec`) with three views
pinned to one `LinearGenomeView` (`id: lgv-<symbol>`): a collapsed-intron LGV, a
connected MsaView, and a connected ProteinView (AlphaFold).

## The six hover directions and their mechanisms

| Direction | Mechanism (file) | Keyed on |
|---|---|---|
| genome → MSA | msaview `genomeToMSA.ts` | `connectedFeature` (g2p) → query-row col |
| MSA → genome | msaview `msaCoordToGenomeCoord.ts` | `connectedFeature` (p2g) |
| genome → 3D | protein3d `GenomeTo1DProteinHoverHighlight` | structure `connectedViewId` |
| 3D → genome | protein3d `structure.hoverGenomeHighlights` | `connectedFeature` g2p + pairwiseAlignment |
| MSA → 3D | msaview `autoConnectStructures` → `structureMatchesMsa` | shared genome view OR uniprotId |
| 3D → MSA | protein3d `ProteinToMsaHoverSync` → `findConnectedMsaView` | `connectedMsaViewId` OR shared genome view |

## SHIPPED

- **MSA → 3D** — jbrowse-plugin-msaview **2.6.3** (npm + CDN /latest/). `structureMatchesMsa`
  pairs by shared genome view OR uniprotId.
- **3D → MSA** — jbrowse-plugin-protein3d **0.5.3** (npm + CDN /latest/, verified live).
  `findConnectedMsaView` resolves the MSA by `connectedMsaViewId` OR the shared genome view.
  This was the one definitively-dead direction (the declarative spec never set
  `connectedMsaViewId`).

## The coordinate-mismatch hypothesis was DEBUNKED (don't precompute g2p)

The prior handoff suspected the genome mappings broke because `userProvidedTranscriptSequence`
(UCSC knownCanonical MSA row) and `connectedFeature` (RefSeq Select) are different transcript
sources. Measured against live data (80-gene spread sample of 20,545): ~79% the hg38 MSA row
is byte-identical to UniProt (1 trailing stop residue), ~10% are real knownCanonical-vs-UniProt
isoform differences (usually C-terminal), ~2.5% truncated UCSC rows, ~9% no Swiss-Prot. The
protein ordinals line up, so g2p (which builds the mapping from CDS coords alone) was never the
problem. Precomputing `genomeToTranscriptSeqMapping` would change nothing.

## SHIPPED — genome-link consistency for all genes (the .cds model)

Both genome directions route genome→codon-ordinal through `connectedFeature` then index into the
knownCanonical sequence (MSA query row / `userProvidedTranscriptSequence`). Using RefSeq Select
for the feature only coincidentally matched (the ~79%); for the divergent ~10% the genome link
drifted in the divergent region.

Fix: build `connectedFeature` from the **knownCanonical CDS model**, which the alignment build
already receives in the UCSC exonAA header (`chr:start-end[+-]` + codon phase) but used to
discard. `scripts/gene-explorer/build-data.mjs` now emits a `.cds` sidecar
(`SYMBOL  ENST  refName  strand  start:end:phase,…`, 0-based interbase). Verified: each gene's
CDS spans sum to `3 × (its hg38 alignment-row length)` for every normal protein-coding gene
(201/210 sampled; the 9 exceptions are Ig/TCR gene segments + HBB, partial in UCSC's own data).

- **Data**: `hg38.knownCanonical.multiz100way.aa.fa.gz.cds` uploaded to
  `s3://jbrowse.org/demos/msaview/100way/` (verified live + CORS). The `.fa.gz`/`.gzi`/`.idx`
  rebuild byte-identical (idx == hosted confirmed), so only `.cds` was new.
- **Website**: `geneExplorer.ts` `fetchGeneCds()` reads the `.cds`; `GeneExplorer.tsx` prefers
  it over `fetchTranscript` (RefSeq), which is now only the fallback for genes outside the
  100-way set. Drops the per-gene RefSeq GFF tabix fetch for covered genes. tsc clean.
- Source files cached at `~/data/gene-explorer/` to avoid re-downloading 474 MB.

## ROOT CAUSE of "no LGV highlight" — stale webgl-poc (FOUND via puppeteer)

A live puppeteer test (`scripts/gene-explorer/test-lgv-highlight.mjs`) proved the structure
loads and aligns (`aligned: true`) but **no view resolves `connectedView`**. The spec pins the
LGV `id: lgv-<symbol>`, but the deployed `jbrowse.org/code/jb2/webgl-poc/` assigned a RANDOM id
(e.g. `EKHfi2bykB`), so the MsaView/ProteinView `connectedViewId: lgv-<symbol>` matched nothing.
Current jbrowse-components `LaunchView-LinearGenomeView` DOES honor a provided `id` (passes it to
`addView`, comment: "lets a session spec pin the created view's id so another view can reference
it via connectedViewId") — the deployed webgl-poc was simply built before that. **The whole
genome↔MSA↔3D linkage hinges on this id; the coordinate work above was correct but invisible
without it.** Fix: webgl-poc rebuilt from current jbrowse-components (pushed 2026-06-27).

Verify after the rebuild: `node scripts/gene-explorer/test-lgv-highlight.mjs TP53`. It drives the
real page → grabs its JBrowse URL → opens it (headless swiftshader Chrome) → waits for
`connectedView` (fails fast if the build still doesn't preserve the id) → sets
`structure.setHoveredPosition` and asserts `structure.hoverGenomeHighlights` lands in the CDS,
codon-spaced. Deterministic unit complement: protein3d `src/ProteinView/geneExplorerLinkage.test.ts`.

## STILL OPEN

- **Deploy the website** (`packages/website`, gmod.org/JBrowseMSA, its own pipeline). Done
  2026-06-27; also includes the rejected-promise-cache fix (a failed `.idx`/`.cds` fetch no
  longer wedges every later lookup) and accurate "no alignment for this gene" copy.
- **Confirm the live test passes** once the webgl-poc rebuild is deployed.
- Cosmetic: the LGV still *displays* the RefSeq Select track while the connected feature +
  collapsed regions are now knownCanonical (coding-only). For the divergent ~10% the visible
  glyph won't perfectly match. A knownGene track in the hosted jbrowse config would align them.
- HBB build truncation (alignment row 91 of 147 aa) is a UCSC-data issue, gene-specific.

## Publish / CDN cheat-sheet (confirmed working)

- Plugin publish: `pnpm version patch` in the plugin repo (CI `publish.yml` publishes on the
  `v*` tag via OIDC; no local npm token needed).
- Plugin store / CDN: in `~/src/jb2plugins/jbrowse-plugin-list`: `pnpm dep` then `pnpm invalidate`.
- Data: `aws s3 cp … s3://jbrowse.org/demos/msaview/100way/` (creds valid locally).
- Alignment rebuild: `node scripts/gene-explorer/build-data.mjs ~/data/gene-explorer/knownCanonical.multiz100way.exonAA.fa.gz ./out` (needs `bgzip`).
