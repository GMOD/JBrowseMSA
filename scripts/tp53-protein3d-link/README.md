# TP53 three-view example (genome ↔ alignment ↔ 3D structure)

Builds the flagship example on the _Genome browser_ docs page: the human
**TP53** gene on hg38, the **p53 ortholog alignment**, and the **AlphaFold p53
structure** (via [jbrowse-plugin-protein3d](https://github.com/GMOD/jbrowse-plugin-protein3d)),
all **connected to one genome view** and opened with a single annotated feature —
the p53 **nuclear export signal motif** — highlighted across all three at once:
magenta in the 3D structure, a band on the genome, and a column band in the
alignment. A small motif rather than the whole DNA-binding domain reads as a
crisp pinpoint highlight (and matches the "Motif" track the jbrowse-components
protein3d example highlights).

It sits alongside the **TP53 R248** example, in the same gene, extended into the
structural dimension — showing that any annotated element can be located three
ways at once.

## How the link works

A single declarative JBrowse session spec (`?config=…&session=spec-…`) with
three views, connected through one pinned genome-view id (`lgv-tp53-3d`):

- a `LinearGenomeView` (pinned `id`, RefSeq Select + ClinVar pathogenic track),
  framed on the motif's genomic span;
- an `MsaView` whose `connectedViewId` points at that id, plus a
  `connectedFeature` (the TP53 transcript model), `querySeqName: human`, and
  `highlightColumns` — the contiguous alignment columns covering the motif, lit
  as a bordered band;
- a `ProteinView` whose `connectedViewId` points at the **same** genome view
  (full-form launch: `url` + `feature` + `userProvidedTranscriptSequence`
  supplied, so it does not create its own LGV), carrying the AlphaFold structure
  URL and `initialSelection` — the structure-residue range pre-selected on load.

`initialSelection` is a declarative protein3d prop (see the plugin's
`Structure` model): it seeds the persistent selection on load exactly as a
feature click would, so the structure / genome / alignment all light up from the
URL with no interaction.

## Reproducible provenance

Every coordinate is derived from a public source, not pasted as a blob:

- **transcript model** (`connectedFeature` / ProteinView `feature`): the same
  public RefSeq GFF the gene track uses (`ncbiRefSeq.gff.gz`, via `tabix`),
  GFF 1-based → JBrowse 0-based interbase. TP53 `NM_000546.6` → `NP_000537.3`.
- **motif residue range**: the EBI UniProt features API
  (`proteins/api/features/P04637`, type `MOTIF`, description "Nuclear export
  signal") — the same source protein3d's own feature track reads. Currently
  residues **339–350**. (Swap `FEATURE_TYPE`/`FEATURE_DESC` in `generate.mjs` to
  feature a different annotated element, e.g. the `DNA_BIND` domain.)
- **protein sequence** (`userProvidedTranscriptSequence`): the degapped `human`
  row of the served alignment (= `NP_000537.3`).
- **alignment columns**: read from the served FASTA so the link can't drift from
  the data.

## Coordinate conventions

- `initialSelection` is a **0-based half-open structure-residue** range. The
  AlphaFold model is the full-length protein, so structure index = residue − 1;
  motif residues 339–350 → `{ start: 338, end: 350 }` (matches what clicking the
  feature, `feature.start − 1 … feature.end`, produces).
- `highlightColumns` are **0-based alignment columns**, the contiguous span from
  the motif's first to last residue column.

## Dependencies in the rest of the stack

- **jbrowse-components** `webgl-poc` branch (forwards a spec `id` to
  `LaunchView-LinearGenomeView` so `connectedViewId` resolves).
- **jbrowse-plugin-protein3d** with the `initialSelection` prop (added for this
  example). Until published, the screenshot serves a local build
  (`scripts/screenshots/jbrowse-figures.mjs --protein3d-dist=…`).
- **jbrowse-plugin-msaview** ≥ 2.5.1 (`connectedViewId` + `connectedFeature` +
  `highlightColumns`). The bordered, clearly-visible `highlightColumns` band is a
  `react-msaview` rendering change; until a release is published _and_ the
  msaview plugin rebuilt against it, the screenshot serves a local plugin build
  (`--plugin-dist=…`, built against the local `react-msaview`).

## Usage

```sh
node scripts/tp53-protein3d-link/generate.mjs   # prints the declarative URL
```

Requires `tabix` (htslib) on PATH and network access to EBI. The printed URL is
the value pasted into `packages/website/src/pages/genome-browser.astro`.
