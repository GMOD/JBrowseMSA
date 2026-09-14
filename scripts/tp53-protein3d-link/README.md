# TP53 three-view example (genome ↔ alignment ↔ 3D structure)

`generate.mjs` builds the three-view example on the _Genome browser_ docs page:
the human **TP53** gene on hg38, the **p53 ortholog alignment**, and the
**AlphaFold p53 structure** (via
[jbrowse-plugin-protein3d](https://github.com/GMOD/jbrowse-plugin-protein3d)),
all **connected to one genome view**. The session opens with the p53 **nuclear
export signal motif** highlighted in all three views: magenta in the 3D
structure, a band on the genome, and a column band in the alignment. The motif
is 12 residues, so the highlight is a narrow band where the whole DNA-binding
domain would cover most of the protein, and it matches the "Motif" track the
jbrowse-components protein3d example highlights.

The **TP53 R248** example covers the same gene with a genome and alignment view;
this one adds the structure.

## How the link works

A single declarative JBrowse session spec (`?config=…&session=spec-…`) holds
three views, connected through one pinned genome-view id (`lgv-tp53-3d`):

- a `LinearGenomeView` (pinned `id`, RefSeq Select + ClinVar pathogenic track),
  framed on the motif's genomic span;
- an `MsaView` whose `connectedViewId` points at that id, plus a
  `connectedFeature` (the TP53 transcript model), `querySeqName: human`, and
  `highlights`, the motif's residue range in the `human` row drawn as a labeled
  band;
- a `ProteinView` whose `connectedViewId` points at the **same** genome view
  (full-form launch: `url`, `feature` and `userProvidedTranscriptSequence`
  supplied, so it does not create its own LGV), carrying the AlphaFold structure
  URL and `initialSelection`, the structure-residue range selected on load.

`initialSelection` is a declarative protein3d prop (see the plugin's `Structure`
model). It seeds the persistent selection on load as a feature click would, so
the URL opens with the structure, genome and alignment highlighted and no
interaction.

## Provenance

Every coordinate comes from a public source:

- **transcript model** (`connectedFeature` / ProteinView `feature`): the public
  RefSeq GFF the gene track uses (`ncbiRefSeq.gff.gz`, via `tabix`), converted
  from GFF 1-based to JBrowse 0-based interbase. TP53 `NM_000546.6` →
  `NP_000537.3`.
- **motif residue range**: the EBI UniProt features API
  (`proteins/api/features/P04637`, type `MOTIF`, description "Nuclear export
  signal"), which protein3d's own feature track also reads. Currently residues
  **339–350**. Change `FEATURE_TYPE`/`FEATURE_DESC` in `generate.mjs` to
  highlight a different annotated element, such as the `DNA_BIND` domain.
- **protein sequence** (`userProvidedTranscriptSequence`): the degapped `human`
  row of the served alignment (= `NP_000537.3`).
- **alignment highlight**: the same residue range, in the `human` row's own
  numbering; the viewer projects it through the alignment's gaps.

## Coordinate conventions

- `initialSelection` is a **0-based half-open structure-residue** range. The
  AlphaFold model is the full-length protein, so structure index = residue − 1;
  motif residues 339–350 → `{ start: 338, end: 350 }`, which matches what
  clicking the feature (`feature.start − 1 … feature.end`) produces.
- `highlights` ranges are **1-based inclusive residues** of the named row, the
  numbering the EBI features API uses.

## Dependencies in the rest of the stack

- **jbrowse-components** `main` branch, which forwards a spec `id` to
  `LaunchView-LinearGenomeView` so `connectedViewId` resolves.
- **jbrowse-plugin-protein3d** with the `initialSelection` prop (added for this
  example). Until it is published, the screenshot serves a local build
  (`scripts/screenshots/jbrowse-figures.mjs --protein3d-dist=…`).
- **jbrowse-plugin-msaview** built on react-msaview ≥ 6.3.0 (`connectedViewId`,
  `connectedFeature` and the labeled `highlights` band). Until the msaview
  plugin is rebuilt against it, the screenshot serves a local plugin build
  (`--plugin-dist=…`, built against the local `react-msaview`).

## Usage

```sh
node scripts/tp53-protein3d-link/generate.mjs   # prints the declarative URL
```

Requires `tabix` (htslib) on PATH and network access to EBI. The printed URL
goes in `website/src/lib/jbrowseLinks.ts`.
