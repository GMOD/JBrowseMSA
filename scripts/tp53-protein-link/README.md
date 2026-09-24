# TP53 session data

`build-data.mjs` builds the files behind the two **TP53** sessions on the
[JBrowse 2 integration](https://gmod.org/JBrowseMSA/tutorials/jbrowse_integration)
page, the hand-written `tp53R248` and `tp53Protein3d` specs in
`website/src/lib/jbrowseLinks.ts`:

- `tp53R248` opens the p53 ortholog alignment _inside_ JBrowse, **connected** to
  the human **TP53** gene on hg38, zoomed onto the **R248** codon, with a
  **ClinVar pathogenic-variant track** in the genome view. The pathogenic
  variants at the R248 codon line up with a 100%-conserved alignment column.
- `tp53Protein3d` adds the AlphaFold p53 structure through
  [jbrowse-plugin-protein3d](https://github.com/GMOD/jbrowse-plugin-protein3d)
  and opens with the nuclear export signal motif (residues 339–350) highlighted
  in the genome, the alignment and the structure.

R248 is the most frequently mutated residue in TP53 across human cancers: it
contacts DNA in the minor groove, is invariant across vertebrates, and the codon
collects a dense stack of distinct pathogenic substitutions.

## The files

`build-data.mjs` regenerates the hosted data under `packages/app/public/data/`:

- `tp53-p53-orthologs.fa` / `tp53-p53.nh`: p53 protein alignment + ClustalW
  neighbor-joining tree across 13 vertebrates. The `human` row is RefSeq
  `NP_000537.3`, the product of `NM_000546.6`, the transcript both sessions name
  in `connectedTranscript`, so residue _i_ lines up with codon _i_. Requires
  `clustalw` + `curl`.
- `tp53-clinvar-pathogenic.vcf.gz(.tbi)`: ClinVar variants across the TP53 locus
  (`17:7668134-7687471`) filtered to germline classification Pathogenic /
  Likely_pathogenic. Requires `tabix` + `bgzip`. **ClinVar updates weekly**, so
  the variant count changes slightly between runs, unlike the alignment, which
  is byte-reproducible.

`jbrowse-msa-combined-config.json` (the shared config) defines the
`hg38-tp53-clinvar-pathogenic` track over the hosted VCF. The VCF keeps refName
`17`, which the hg38 `refNameAliases` resolve to `chr17`.

## Usage

```sh
node scripts/tp53-protein-link/build-data.mjs
```
