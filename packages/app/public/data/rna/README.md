# RNA family tutorial data

The file the figures in [`docs/tutorials/rna_family.md`](../../../../../docs/tutorials/rna_family.md)
load, served at `gmod.org/JBrowseMSA/demo/data/rna/*`. One run of
`docs/tutorials/scripts/build_rna_family.sh` writes it, and it prints every
number the page quotes.

| File                 | Format              | Step | Provenance                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sam-riboswitch.sto` | Stockholm (tree+SS) | 1-5  | 37 SAM-I riboswitches found by `cmsearch` with the Rfam [RF00162](https://rfam.org/family/RF00162) model in six Firmicute genomes (step 1), named by the gene each leads (step 2), aligned to the model with `cmalign` (step 3), the pseudoknot copied back from the Rfam seed (step 4), FastTree tree embedded as `#=GF NH` (step 5) |
