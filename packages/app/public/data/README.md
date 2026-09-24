# Hosted example data

The demo app serves these files at `gmod.org/JBrowseMSA/demo/data/*` (and at
the app root in local dev). A `#data=` deep link can point a `msaFilehandle`,
`treeFilehandle` or `gffFilehandle` at a hosted file instead of inlining the
whole alignment in the URL. The user-guide figures link to live views this way,
which keeps those links small; the lysine Stockholm alone is ~26 KB inline.

The files here are **copies**. `scripts/examples-gen/generate.mjs` writes each
dataset to `packages/examples/data`, the examples import it from there, and
`writeExampleData.mjs` copies it here. Refresh this directory after regenerating
a dataset:

```sh
node scripts/screenshots/writeExampleData.mjs
```

(`pnpm screenshots` runs this automatically before building the app.)

`scripts/examples-gen/README.md` records the provenance of each dataset: which
accessions, how they were aligned, and where its domain GFF came from. The files
it does not cover:

| File                      | Provenance                                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `il2ra.aln` / `il2ra.nh`  | IL2RA/IL2RB/IL2RG across mammals, the small protein alignment the Getting started examples and the homepage viewer show                        |
| `nlrp1.aln`               | Twelve NLRP1 orthologs from UniProt, ClustalW, 1666 columns, which step 3 of [protein_family](../../../../docs/tutorials/protein_family.md) writes |
| `nlrp1.nh`                | ClustalW neighbor-joining tree of `nlrp1.aln`, step 4 of the same page                                                                         |
| `nlrp1-domains.gff`       | InterPro 110.0 precomputed Pfam matches for the twelve accessions (`react-msaview-cli interpro`), step 5 of the same page                      |
| `nlrp1-unaligned.aln`     | The aligner's own input, right-padded to a common width, so the unaligned half of `docs/media/column-lock.png` is the same sequences unaligned |
| `lysine.stock`            | Rfam Lysine riboswitch [RF00168](https://rfam.org/family/RF00168) seed alignment: 60 bacterial sequences, tree (`#=GF NH`) and SS embedded     |
| `f12-cetacean-cds.stock`  | Coagulation factor XII coding alignment across mammals (UCSC cactus 241-way), tree embedded; built by `scripts/f12-cetacean`                   |
| `f12-cetacean-exons.gff`  | F12's 14 coding exons projected onto every row (`react-msaview-cli genestructure`), each `Name=exon-N` so one exon is one color across species |
| `gene-cluster.stock/.gff` | A synthetic colinear gene cluster for the arrow-map overlay; built by `scripts/gene-cluster`                                                   |

The files below back the sessions on the
[JBrowse 2 integration](https://gmod.org/JBrowseMSA/tutorials/jbrowse_integration)
page, built by `scripts/braf-protein-link/` and `scripts/tp53-protein-link/`
(see their READMEs), not by `writeExampleData.mjs`:

| File                              | Format            | Provenance                                                                                          |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `multiz470way-mammals.nh`         | Newick            | Pruned UCSC `hg38.470way.nh` (the MAF track's displayed species)                                    |
| `jbrowse-msa-combined-config.json`| JBrowse config    | hg38 + NCBI RefSeq (all + RefSeq Select/MANE) gene tracks + Multiz 470-way MAF + BRAF & TP53 ClinVar tracks + the MsaView plugin |
| `braf.aln`                        | CLUSTAL           | RAF-family kinases (BRAF/ARAF/RAF1 human, BRAF mouse/chick, KRAF1 fly), full-length UniProt, Clustal; query row `BRAF_HUMAN` (P15056, 766 aa) for the V600E protein↔genome link |
| `braf.nh`                         | Newick            | Clustal guide tree for `braf.aln`                                                                    |
| `tp53-p53-orthologs.fa`           | FASTA (aligned)   | p53 across 13 vertebrates, NCBI RefSeq proteins, ClustalW; query row `human` (NP_000537.3, 393 aa) for the R248 protein↔genome link |
| `tp53-p53.nh`                     | Newick            | ClustalW neighbor-joining tree for `tp53-p53-orthologs.fa`                                           |
| `tp53-clinvar-pathogenic.vcf.gz`  | VCF (bgzip+tabix) | ClinVar (GRCh38) variants over the TP53 locus filtered to Pathogenic/Likely_pathogenic; ClinVar updates weekly, so the count changes |

Each folder below backs one tutorial, and the folder's own README names its
files and the step that writes each. `pnpm check:data` (CI runs it) fails on a
folder missing from this table, a row naming a page or a script that does not
exist, a file its folder README does not name, and a `data=` link anywhere in
the docs that loads a file no longer here.

| Folder           | Tutorial                                                                                     | Built by                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `h3n2/`          | [notebook_flu_drift](../../../../docs/tutorials/notebook_flu_drift.md)                       | `docs/tutorials/scripts/build_flu_drift.py`                                                                 |
| `h5n1/`          | [influenza_surveillance_figure](../../../../docs/tutorials/influenza_surveillance_figure.md) | `docs/tutorials/scripts/build_influenza_surveillance_figure.py`                                             |
| `hemoglobin/`    | [protein_complex](../../../../docs/tutorials/protein_complex.md)                             | `docs/tutorials/scripts/build_protein_complex.sh`                                                           |
| `kinase-pocket/` | [kinase_pocket](../../../../docs/tutorials/kinase_pocket.md)                                 | `docs/tutorials/scripts/build_kinase_pocket.sh`                                                             |
| `mitogenome/`    | [mitogenome_genes](../../../../docs/tutorials/mitogenome_genes.md)                           | `docs/tutorials/scripts/build_mitogenome_genes.sh`                                                          |
| `neighborhoods/` | [gene_neighborhoods](../../../../docs/tutorials/gene_neighborhoods.md)                       | `docs/tutorials/scripts/build_gene_neighborhoods.sh`                                                        |
| `norovirus/`     | [norovirus_recombination](../../../../docs/tutorials/norovirus_recombination.md)             | `docs/tutorials/scripts/build_norovirus_recombination.sh`                                                   |
| `p53/`           | [p53_variant_effects](../../../../docs/tutorials/p53_variant_effects.md)                     | `docs/tutorials/scripts/build_p53_variant_effects.sh`                                                       |
| `proteases/`     | [r_protease_triad](../../../../docs/tutorials/r_protease_triad.md)                           | `docs/tutorials/scripts/build_r_protease_triad.R`                                                           |
| `recombinant/`   | [recombination_breakpoint](../../../../docs/tutorials/recombination_breakpoint.md)           | `docs/tutorials/scripts/build_recombination_breakpoint.sh`                                                  |
| `rna/`           | [rna_family](../../../../docs/tutorials/rna_family.md)                                       | `docs/tutorials/scripts/build_rna_family.sh`                                                                |
| `scale/`         | [phylogeny_at_scale](../../../../docs/tutorials/phylogeny_at_scale.md) and [phylogeny_metadata](../../../../docs/tutorials/phylogeny_metadata.md) | `docs/tutorials/scripts/build_phylogeny_at_scale.sh` and `docs/tutorials/scripts/build_phylogeny_metadata.py` |
| `spike/`         | [spike_structure](../../../../docs/tutorials/spike_structure.md)                             | `docs/tutorials/scripts/build_spike_structure.sh`                                                           |
| `tdp43/`         | [alphafold_confidence](../../../../docs/tutorials/alphafold_confidence.md)                   | `docs/tutorials/scripts/build_alphafold_confidence.sh`                                                      |
| `tem/`           | [tem_alleles](../../../../docs/tutorials/tem_alleles.md)                                     | `docs/tutorials/scripts/build_tem_alleles.sh`                                                               |
| `trim5/`         | [codon_selection](../../../../docs/tutorials/codon_selection.md)                             | `docs/tutorials/scripts/build_codon_selection.sh`                                                           |

The parsers detect the format from file content (the `CLUSTAL` / `# STOCKHOLM` /
`>` / `##gff` header), so the extensions above are only for readability.
