# BRAF V600E protein-linked example (protein ↔ genome, on the mutation)

Builds the **BRAF** example on the _Genome browser_ docs page: the RAF-family
kinase alignment opened _inside_ JBrowse, **connected** to the human **BRAF**
gene on hg38 and zoomed onto the **V600** codon. Same connected pattern as
`scripts/src-protein-link/` (SRC), but opened on a single residue, with the V600
alignment column pre-highlighted and a matching highlight band on the V600E
codon in the genome.

V600E (`c.1799T>A`, hg38 `chr7:140,753,336`) swaps valine for glutamate in the
kinase activation segment and is the most common oncogenic mutation in melanoma.
V600 is invariant across the RAF family and across human/mouse/chicken/fly,
which the alignment column makes visible.

## How the link works

A single declarative JBrowse session spec (`?config=…&session=spec-…`) with two
views:

- a `LinearGenomeView` with a **pinned `id`** (`lgv-braf`), `loc` on the V600
  codon and a `highlight` band over it, and
- an `MsaView` whose `connectedViewId` points at that id, plus a
  `connectedFeature` (the BRAF transcript model for the codon mapping),
  `querySeqName: BRAF_HUMAN`, and `highlightColumns: [647]` — the 0-based
  aligned column of BRAF_HUMAN residue 600, which `generate.mjs` reads out of
  `braf.aln` itself rather than hard-coding.

The `LinearGenomeView` also sets `colorByCDS: true` (codon-frame colouring on
the reference sequence) and overrides the gene-track display with
`geneGlyphMode: "longestCoding"`, so the base-level zoom shows the single
canonical transcript in-frame instead of a stack of isoforms. It carries a
`hg38-braf-clinvar-pathogenic` `VariantTrack` so the V600 pathogenic-allele
pileup sits over the same codon (built by `build-clinvar.mjs`, see below).

The query row `BRAF_HUMAN` (UniProt P15056, 766 aa) is byte-for-byte the protein
of RefSeq `NM_004333.6` → `NP_004324.2`, so the query row's residue _i_ lines up
exactly with the transcript's codon _i_, and column 647 maps to V600 = `c.1799`.

## Dependencies in the rest of the stack

Same as `scripts/src-protein-link/`: needs the `webgl-poc` jbrowse-components
branch (forwards a spec `id` to `LaunchView-LinearGenomeView` so
`connectedViewId` resolves) and `jbrowse-plugin-msaview` ≥ 2.5.1 (forwards
`connectedViewId` + `connectedFeature` + `highlightColumns`).

## connectedFeature + codon coordinate provenance

`genomeToTranscriptSeqMapping` only needs
`{ refName, strand, subfeatures: [{ type: 'CDS', start, end, phase }] }`. We
derive those from the **same public RefSeq GFF the gene track uses**
(`https://jbrowse.org/ucsc/hg38/ncbiRefSeq.gff.gz`), converting GFF 1-based
coordinates to JBrowse 0-based interbase (`start-1, end`). BRAF `NM_004333.6` is
18 CDS = 2298 bp = 766 codons, matching `BRAF_HUMAN`. The script also walks the
CDS in translation order (minus strand) to locate the V600 codon's genomic span
for the `loc`/`highlight`.

## The alignment + tree (`braf.aln`, `braf.nh`)

`work/` holds the inputs: full-length UniProt sequences for the RAF family
(`BRAF`/`ARAF`/`RAF1` human, `BRAF` mouse/chicken, `KRAF1` _Drosophila_),
aligned with Clustal to produce `raf-family.aln` (→
`packages/app/public/data/braf.aln`) and its guide tree (→ `braf.nh`).

## The ClinVar track (`braf-clinvar-pathogenic.vcf.gz`)

`build-clinvar.mjs` pulls the BRAF locus (`7:140,713,328-140,924,929`) out of
NCBI's `clinvar.vcf.gz`, keeps only Pathogenic / Likely_pathogenic germline
classifications, and bgzip+tabix-indexes the result into
`packages/app/public/data/`. Same filter as `scripts/tp53-protein-link/`.

## Usage

```sh
node scripts/braf-protein-link/build-clinvar.mjs  # regenerate the ClinVar VCF
node scripts/braf-protein-link/generate.mjs       # prints the declarative URL
```

Requires `tabix`/`bgzip` (htslib) on PATH for the remote RefSeq + ClinVar
fetches. The printed URL is the value pasted into
`website/src/pages/gallery.astro`.
