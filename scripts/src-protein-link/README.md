# SRC protein-linked example (protein ↔ genome coordinate sync)

Builds the **protein** example on the _Genome browser_ docs page: the Src-family
kinase alignment opened _inside_ JBrowse, **connected** to the human **SRC**
gene on hg38 so the two views share coordinates. Clicking a residue in the MSA
navigates the genome to its codon; hovering the gene highlights the MSA column —
a true protein↔genome codon mapping rather than two independent views.

Same philosophy as `scripts/examples-gen/`: the link is built reproducibly from
a public source rather than pasted in as an opaque blob.

## How the link works

It's a single declarative JBrowse session spec (`?config=…&session=spec-…`) with
two views:

- a `LinearGenomeView` with a **pinned `id`** (`lgv-src`), and
- an `MsaView` whose `connectedViewId` points at that id, plus a
  `connectedFeature` (the SRC transcript model used for the codon mapping) and
  `querySeqName: SRC_HUMAN`.

The MSA already contains `SRC_HUMAN` (UniProt P12931, the canonical 536-aa
c-Src), which is byte-for-byte the protein of RefSeq `NM_005417.5` →
`NP_005408.1`, so the query row's residue _i_ lines up exactly with the
transcript's codon _i_.

## Dependencies in the rest of the stack

- **jbrowse-components**: `LaunchView-LinearGenomeView` must forward a spec `id`
  to the created view so `connectedViewId` can reference it. Without it the
  spec's LGV gets an auto-generated id and the connection can't resolve. (Landed
  on the `webgl-poc` branch; the docs link targets
  `jbrowse.org/code/jb2/webgl-poc`.)
- **jbrowse-plugin-msaview** (≥ 2.5.0): the `LaunchView-MsaView` extension point
  already forwards `connectedViewId` + `connectedFeature`.

## connectedFeature provenance

`genomeToTranscriptSeqMapping` (g2p_mapper) only needs
`{ refName, strand, subfeatures: [{ type: 'CDS', start, end, phase }] }`. We
derive those from the **same public RefSeq GFF the gene track uses**
(`https://jbrowse.org/ucsc/hg38/ncbiRefSeq.gff.gz`), converting GFF 1-based
coordinates to JBrowse 0-based interbase (`start-1, end`). SRC `NM_005417.5` is
11 CDS = 1608 bp = 536 codons, matching `SRC_HUMAN`.

## Usage

```sh
node scripts/src-protein-link/generate.mjs   # prints the declarative URL
```

Requires `tabix` (htslib) on PATH for the remote RefSeq fetch. The printed URL
is the value pasted into `packages/website/src/pages/genome-browser.astro`.
