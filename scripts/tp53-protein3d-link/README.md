# TP53 three-view example (genome ↔ alignment ↔ 3D structure)

Builds the flagship example on the _Genome browser_ docs page: the human
**TP53** gene on hg38, the **p53 ortholog alignment**, and the **AlphaFold p53
structure** (via [jbrowse-plugin-protein3d](https://github.com/GMOD/jbrowse-plugin-protein3d)),
all **connected to one genome view** and opened with the p53 **DNA-binding
domain** highlighted across all three at once — magenta in the 3D structure, a
band on the genome, and a column band in the alignment.

It extends the **TP53 R248** example into the structural dimension: R248 (the
most-mutated p53 residue, a 100%-conserved alignment column under a ClinVar
pathogenic pileup) sits _inside_ this DNA-binding domain, so the three TP53
figures tell one continuous story.

## How the link works

A single declarative JBrowse session spec (`?config=…&session=spec-…`) with
three views, connected through one pinned genome-view id (`lgv-tp53-3d`):

- a `LinearGenomeView` (pinned `id`, RefSeq Select + ClinVar pathogenic track),
  framed on the domain's genomic span;
- an `MsaView` whose `connectedViewId` points at that id, plus a
  `connectedFeature` (the TP53 transcript model), `querySeqName: human`, and
  `highlightColumns` — the contiguous alignment columns covering the domain, lit
  as a solid band;
- a `ProteinView` whose `connectedViewId` points at the **same** genome view
  (full-form launch: `url` + `feature` + `userProvidedTranscriptSequence`
  supplied, so it does not create its own LGV), carrying the AlphaFold structure
  URL and `initialSelection` — the structure-residue range pre-selected on load.

`initialSelection` is a declarative protein3d prop (see the plugin's
`Structure` model): it seeds the persistent selection on load exactly as a
domain click would, so the structure / genome / alignment all light up from the
URL with no interaction.

## Reproducible provenance

Every coordinate is derived from a public source, not pasted as a blob:

- **transcript model** (`connectedFeature` / ProteinView `feature`): the same
  public RefSeq GFF the gene track uses (`ncbiRefSeq.gff.gz`, via `tabix`),
  GFF 1-based → JBrowse 0-based interbase. TP53 `NM_000546.6` → `NP_000537.3`.
- **DNA-binding-domain residue range**: the EBI UniProt features API
  (`proteins/api/features/P04637`, type `DNA_BIND`) — the same source
  protein3d's own feature track reads. Currently residues **102–292**.
- **protein sequence** (`userProvidedTranscriptSequence`): the degapped `human`
  row of the served alignment (= `NP_000537.3`).
- **alignment columns**: read from the served FASTA so the link can't drift from
  the data.

## Coordinate conventions

- `initialSelection` is a **0-based half-open structure-residue** range. The
  AlphaFold model is the full-length protein, so structure index = residue − 1;
  domain residues 102–292 → `{ start: 101, end: 292 }` (matches what clicking the
  `DNA_BIND` feature, `feature.start − 1 … feature.end`, produces).
- `highlightColumns` are **0-based alignment columns**, the contiguous span from
  the domain's first to last residue column.

## Dependencies in the rest of the stack

- **jbrowse-components** `webgl-poc` branch (forwards a spec `id` to
  `LaunchView-LinearGenomeView` so `connectedViewId` resolves).
- **jbrowse-plugin-msaview** ≥ 2.5.1 (`connectedViewId` + `connectedFeature` +
  `highlightColumns`).
- **jbrowse-plugin-protein3d** with the `initialSelection` prop (added for this
  example). Until published, the screenshot serves a local build
  (`scripts/screenshots/jbrowse-figures.mjs --protein3d-dist=…`).

## Usage

```sh
node scripts/tp53-protein3d-link/generate.mjs   # prints the declarative URL
```

Requires `tabix` (htslib) on PATH and network access to EBI. The printed URL is
the value pasted into `packages/website/src/pages/genome-browser.astro`.
