# Hosted example data

These files are served at `gmod.org/JBrowseMSA/demo/data/*` (and at the app
root in local dev). They let a `?data=` deep-link point a `msaFilehandle` /
`treeFilehandle` / `gffFilehandle` at a hosted file instead of inlining the
whole alignment in the URL — the user-guide figures link to live views this
way, keeping those links small (the lysine Stockholm alone is ~26 KB inline).

They are **generated**, not hand-maintained — each is written verbatim from a
constant in `packages/examples/src/examples/exampleData.ts`, which carries the
authoritative provenance comment for every dataset. Regenerate after changing a
source constant:

```sh
node scripts/screenshots/writeExampleData.mjs
```

(`pnpm screenshots` runs this automatically before building the app.)

| File                 | Source constant    | Format              | Provenance                                                                                                 |
| -------------------- | ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `kinase.aln`         | `kinaseMSA`        | CLUSTAL             | Src-family kinases (SRC/YES/FYN/FGR/HCK/LYN/LCK/BLK, human + SRC mouse/chick), full-length UniProt sequences aligned with Clustal Omega |
| `kinase.nh`          | `kinaseTree`       | Newick              | Clustal Omega guide tree for the alignment above                                                           |
| `kinase-domains.gff` | `kinaseDomainsGFF` | InterProScan GFF3   | `react-msaview-cli interproscan kinase.aln` against the EBI InterProScan API (PfamA, CDD)                  |
| `lysine.stock`       | `lysineMSA`        | Stockholm (tree+SS) | Rfam Lysine riboswitch [RF00168](https://rfam.org/family/RF00168) seed alignment — 60 bacterial sequences, tree (`#=GF NH`) and SS embedded |

The files below back the **Genome browser** docs page (JBrowse integration), built by
`scripts/braf-protein-link/` and `scripts/tp53-protein-link/`
(see their READMEs), not by `writeExampleData.mjs`:

| File                              | Format            | Provenance                                                                                          |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `multiz470way-mammals.nh`         | Newick            | Pruned UCSC `hg38.470way.nh` (the MAF track's displayed species)                                    |
| `jbrowse-msa-combined-config.json`| JBrowse config    | hg38 + NCBI RefSeq (all + RefSeq Select/MANE) gene tracks + Multiz 470-way MAF + BRAF & TP53 ClinVar tracks + the MsaView plugin |
| `braf.aln`                        | CLUSTAL           | RAF-family kinases (BRAF/ARAF/RAF1 human, BRAF mouse/chick, KRAF1 fly), full-length UniProt, Clustal — query row `BRAF_HUMAN` (P15056, 766 aa) for the V600E protein↔genome link |
| `braf.nh`                         | Newick            | Clustal guide tree for `braf.aln`                                                                    |
| `tp53-p53-orthologs.fa`           | FASTA (aligned)   | p53 across 13 vertebrates, NCBI RefSeq proteins, ClustalW — query row `human` (NP_000537.3, 393 aa) for the R248 protein↔genome link |
| `tp53-p53.nh`                     | Newick            | ClustalW neighbor-joining tree for `tp53-p53-orthologs.fa`                                           |
| `tp53-clinvar-pathogenic.vcf.gz`  | VCF (bgzip+tabix) | ClinVar (GRCh38) variants over the TP53 locus filtered to Pathogenic/Likely_pathogenic — weekly-updated source, count drifts |

The formats are detected from file content (the `CLUSTAL` / `# STOCKHOLM` / `>` /
`##gff` header), so the extensions above are only for readability.
