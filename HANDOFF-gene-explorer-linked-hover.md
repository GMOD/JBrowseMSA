# Handoff: Gene Explorer three-way linked hover (genome ↔ MSA ↔ 3D structure)

Spans three repos:

- `~/src/react-msaview` — the website + gene explorer (`website`) + the
  alignment build (`scripts/gene-explorer`)
- `~/src/jb2plugins/jbrowse-plugin-msaview` — the MSA view JBrowse plugin
- `~/src/jb2plugins/jbrowse-plugin-protein3d` — the 3D structure JBrowse plugin

The gene explorer's "Open in JBrowse" builds a declarative JBrowse session spec
(`website/src/lib/geneExplorer.ts` → `buildSessionUrl`) with three views pinned
to one `LinearGenomeView` (`id: lgv-<symbol>`): a collapsed-intron LGV, a
connected MsaView, and a connected ProteinView (AlphaFold). The whole linkage
hinges on the LGV keeping that pinned `id` — `connectedViewId: lgv-<symbol>` on
the other two views resolves nothing otherwise.

## The six hover directions and their mechanisms

| Direction    | Mechanism (file)                                           | Keyed on                                   |
| ------------ | ---------------------------------------------------------- | ------------------------------------------ |
| genome → MSA | msaview `genomeToMSA.ts`                                   | `connectedFeature` (g2p) → query-row col   |
| MSA → genome | msaview `msaCoordToGenomeCoord.ts`                         | `connectedFeature` (p2g)                   |
| genome → 3D  | protein3d `GenomeTo1DProteinHoverHighlight`                | structure `connectedViewId`                |
| 3D → genome  | protein3d `structure.hoverGenomeHighlights`                | `connectedFeature` g2p + pairwiseAlignment |
| MSA → 3D     | msaview `autoConnectStructures` → `structureMatchesMsa`    | shared genome view OR uniprotId            |
| 3D → MSA     | protein3d `ProteinToMsaHoverSync` → `findConnectedMsaView` | `connectedMsaViewId` OR shared genome view |

## STILL OPEN

- **Merge + redeploy the website** for the any-gene 3D change (branch
  `gene-explorer-3d-any-gene`): the ProteinView is no longer gated on
  `msaAvailable`, so genes outside the 100-way set get a linked genome↔3D
  session using the UniProt canonical sequence
  (`rest.uniprot.org/uniprotkb/<acc>.fasta`) as `userProvidedTranscriptSequence`.
- **Confirm the live three-way hover** once the rebuilt `jbrowse.org/code/jb2/webgl-poc/`
  is deployed. The deployed build must honor the pinned LGV `id` (current
  jbrowse-components `LaunchView-LinearGenomeView` does; an older build assigned
  a random id, which silently broke every `connectedViewId`). Verify:
  `node scripts/gene-explorer/test-lgv-highlight.mjs TP53` (drives the real page,
  opens its JBrowse URL headless, waits for `connectedView`, asserts
  `structure.hoverGenomeHighlights` lands in the CDS, codon-spaced). Deterministic
  unit complement: protein3d `src/ProteinView/geneExplorerLinkage.test.ts`.
- Cosmetic: the LGV displays the RefSeq Select track while the connected feature
  + collapsed regions are knownCanonical (coding-only). For the ~10% of genes
  where knownCanonical diverges from RefSeq, the visible glyph won't perfectly
  match; a knownGene track in the hosted jbrowse config would align them.
- HBB build truncation (alignment row 91 of 147 aa) is a UCSC-data issue,
  gene-specific.

Dead end (measured, don't repeat): precomputing `genomeToTranscriptSeqMapping` /
g2p changes nothing — the protein ordinals already line up (g2p builds its
mapping from CDS coords alone).

## Publish / CDN cheat-sheet (confirmed working)

- Plugin publish: `pnpm version patch` in the plugin repo (CI `publish.yml`
  publishes on the `v*` tag via OIDC; no local npm token needed).
- Plugin store / CDN: in `~/src/jb2plugins/jbrowse-plugin-list`: `pnpm dep` then
  `pnpm invalidate`.
- Data: `aws s3 cp … s3://jbrowse.org/demos/msaview/100way/` (creds valid
  locally).
- Alignment rebuild:
  `node scripts/gene-explorer/build-data.mjs ~/data/gene-explorer/knownCanonical.multiz100way.exonAA.fa.gz ./out`
  (needs `bgzip`).
