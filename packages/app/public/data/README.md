# Hosted example data

The demo app serves these files at `gmod.org/JBrowseMSA/demo/data/*` (and at
the app root in local dev). A `?data=` deep-link can point a `msaFilehandle`,
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

The `spike/` folder backs the
[spike_structure tutorial](../../../../docs/tutorials/spike_structure.md) and is
built by `docs/tutorials/scripts/build_spike_structure.sh`, which prints every
number that page quotes:

| File                 | Format                | Provenance                                                                                                             |
| -------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `spike-rows.tsv`     | TSV                   | The tutorial's row table: NCBI protein accession, row label, UniProtKB entry where one exists                          |
| `spike.afa`          | FASTA (aligned)       | Eleven coronavirus spike glycoproteins from NCBI efetch, aligned with `mafft --auto` (L-INS-i), 1660 columns            |
| `spike.nwk`          | Newick                | `FastTree -lg` on the alignment above                                                                                  |
| `spike-domains.gff`  | GFF3 (domains)        | InterPro 110.0 precomputed Pfam matches (`react-msaview-cli interpro`) for the 8 rows whose UniProt entry is the same sequence as the row |
| `spike-layers.json`  | JSON (snapshot layers) | `highlights` from the P0DTC2 feature table, `residueMappings` from SIFTS plus PDBe polymer coverage for 6VXX chain A, and the coverage text track derived from it |

No filehandle loads `spike-layers.json`. The figures' `?data=` links carry its
three layers inline, and the file is hosted so the page can cite it and
`scripts/screenshots/tutorial-specs/spike_structure.mjs` can read it.

The files below back the **Kinase pocket** tutorial
(`docs/tutorials/kinase_pocket.md`), built by
`docs/tutorials/scripts/build_kinase_pocket.sh`, not by `writeExampleData.mjs`:

| File | Format | Provenance |
| ---- | ------ | ---------- |
| `kinase-pocket/kinase-pocket.afa` | FASTA (aligned) | 474 of the 512 UniProt `pkinfam.txt` human kinases, the ones whose Pkinase domain (PF00069) clears Pfam's gathering threshold, aligned to that HMM with `hmmalign --trim` (262 columns) |
| `kinase-pocket/kinase-pocket.nwk` | Newick | FastTree from the alignment above |
| `kinase-pocket/kinase-pocket-metadata.json` | JSON (`treeMetadata`) | Each row's kinase group (AGC/CAMK/CK1/CMGC/NEK/RGC/STE/TKL/TK/Other) and UniProt accession, read by the tree's node-info dialog |

The `rna/` folder backs the
[rna_family tutorial](../../../../docs/tutorials/rna_family.md) and is built by
`docs/tutorials/scripts/build_rna_family.sh`, which prints every number that
page quotes:

| File                     | Format              | Provenance                                                                                                                                                                                            |
| ------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rna/sam-riboswitch.sto` | Stockholm (tree+SS) | 37 SAM-I riboswitches found by `cmsearch` with the Rfam [RF00162](https://rfam.org/family/RF00162) model in six Firmicute genomes, aligned to it with `cmalign`, consensus structure and SAM contacts copied from the Rfam seed, FastTree tree embedded as `#=GF NH` |

The parsers detect the format from file content (the `CLUSTAL` / `# STOCKHOLM` /
`>` / `##gff` header), so the extensions above are only for readability.
