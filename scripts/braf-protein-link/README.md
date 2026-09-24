# BRAF V600E session data

The scripts here build the files behind the **BRAF V600E** session on the
[JBrowse 2 integration](https://gmod.org/JBrowseMSA/tutorials/jbrowse_integration)
page: the RAF-family kinase alignment opened _inside_ JBrowse, **connected** to
the human **BRAF** gene on hg38 and zoomed onto the **V600** codon. The session
itself is the hand-written `brafV600` spec in `website/src/lib/jbrowseLinks.ts`.

V600E (`c.1799T>A`, hg38 `chr7:140,753,336`) swaps valine for glutamate in the
kinase activation segment and is the most common oncogenic mutation in melanoma.
V600 is invariant across the RAF family and across human/mouse/chicken/fly,
which the alignment column makes visible.

## The alignment and tree (`braf.aln`, `braf.nh`)

`build-alignment.mjs` fetches full-length UniProt sequences for the RAF family
(`BRAF`/`ARAF`/`RAF1` human, `BRAF` mouse/chicken, `KRAF1` _Drosophila_) into
`work/`, aligns them with ClustalW, and writes the alignment to
`packages/app/public/data/braf.aln` and its guide tree to `braf.nh`.

The query row `BRAF_HUMAN` (UniProt P15056, 766 aa) is byte-for-byte the protein
of RefSeq `NM_004333.6` → `NP_004324.2`, the transcript the session names in
`connectedTranscript`. Residue _i_ of the row therefore lines up with codon _i_
of the transcript, and residue 600 is V600 = `c.1799`.

## The ClinVar track (`braf-clinvar-pathogenic.vcf.gz`)

`build-clinvar.mjs` pulls the BRAF locus (`7:140,713,328-140,924,929`) out of
NCBI's `clinvar.vcf.gz`, keeps only Pathogenic / Likely_pathogenic germline
classifications, and bgzip+tabix-indexes the result into
`packages/app/public/data/`. `jbrowse-msa-combined-config.json` defines the
`hg38-braf-clinvar-pathogenic` track over it. The filter is the same as in
`scripts/tp53-protein-link/build-data.mjs`.

## Usage

```sh
node scripts/braf-protein-link/build-alignment.mjs  # braf.aln + braf.nh
node scripts/braf-protein-link/build-clinvar.mjs    # the ClinVar VCF
```

`build-alignment.mjs` requires `clustalw` and network access to UniProt.
`build-clinvar.mjs` requires `tabix`/`bgzip` (htslib) and network access to
NCBI.
