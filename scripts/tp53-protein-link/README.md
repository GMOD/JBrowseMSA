# TP53 R248 example (conservation ↔ pathogenicity, on the hotspot)

Builds the **TP53** example on the _Genome browser_ docs page: the p53 ortholog
alignment opened _inside_ JBrowse, **connected** to the human **TP53** gene on
hg38, zoomed onto the **R248** codon, with a **ClinVar pathogenic-variant
track** in the genome view. The wall of disease variants over the R248 codon
sits directly above a 100%-conserved alignment column. Same connected pattern as
`scripts/src-protein-link/` (SRC) and `scripts/braf-protein-link/` (BRAF).

R248 is the most frequently mutated residue in TP53 across human cancers: it
contacts DNA in the minor groove, is invariant across vertebrates, and the codon
collects a dense stack of distinct pathogenic substitutions.

## Two scripts

- **`build-data.mjs`** — regenerates the hosted data under
  `packages/app/public/data/`:
  - `tp53-p53-orthologs.fa` / `tp53-p53.nh` — p53 protein alignment + ClustalW
    neighbor-joining tree across 13 vertebrates. The `human` row is RefSeq
    `NP_000537.3` (the product of `NM_000546.6`, the transcript the link maps
    to), so residue _i_ lines up with codon _i_. Requires `clustalw` + `curl`.
  - `tp53-clinvar-pathogenic.vcf.gz(.tbi)` — ClinVar variants across the TP53
    locus (`17:7668134-7687471`) filtered to germline classification Pathogenic
    / Likely_pathogenic. Requires `tabix` + `bgzip`. **ClinVar is a live,
    weekly-updated source**, so the variant count drifts slightly between runs
    (it is not byte-reproducible the way the alignment is).
- **`generate.mjs`** — prints the declarative JBrowse link. Reads the served
  alignment to locate R248's column (no hand-maintained index) and derives the
  `connectedFeature` (BRAF/SRC-style) from the public RefSeq GFF. Requires
  `tabix`.

## How the link works

A single session spec (`?config=…&session=spec-…`) with two views:

- a `LinearGenomeView` (pinned `id` `lgv-tp53`) on the R248 codon, with a
  `highlight` band over it and
  `tracks: [hg38-ncbiRefSeq, hg38-tp53-clinvar-pathogenic]`, and
- an `MsaView` whose `connectedViewId` points at it, plus `connectedFeature`
  (the TP53 transcript model), `querySeqName: human`, and
  `highlightColumns: [258]` (R248's aligned column).

The ClinVar track is defined in `jbrowse-msa-combined-config.json` (the shared
config), pointing at the hosted VCF; the VCF keeps refName `17`, resolved to
`chr17` by the hg38 `refNameAliases`.

## Dependencies in the rest of the stack

Same as the SRC/BRAF examples: the `webgl-poc` jbrowse-components branch
(forwards a spec `id` to `LaunchView-LinearGenomeView`) and
`jbrowse-plugin-msaview` ≥ 2.5.1 (which forwards `connectedViewId`,
`connectedFeature` and `highlightColumns`).

## Usage

```sh
node scripts/tp53-protein-link/build-data.mjs   # rebuild hosted data
node scripts/tp53-protein-link/generate.mjs     # print the declarative URL
```
