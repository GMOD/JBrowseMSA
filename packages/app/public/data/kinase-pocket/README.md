# Kinase pocket tutorial data

The files the figures in [`docs/tutorials/kinase_pocket.md`](../../../../../docs/tutorials/kinase_pocket.md)
load, served at `gmod.org/JBrowseMSA/demo/data/kinase-pocket/*`. All three come
out of one run of `docs/tutorials/scripts/build_kinase_pocket.sh`, which prints
every number the page quotes.

| File                          | Format                | Step | Provenance                                                                                                                                                                             |
| ----------------------------- | --------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kinase-pocket.afa`           | FASTA (aligned)       | 3    | 474 of the 512 UniProt `pkinfam.txt` human kinases, the ones whose Pkinase domain (PF00069) clears Pfam's gathering threshold, aligned to that HMM with `hmmalign --trim` (262 columns) |
| `kinase-pocket.nwk`           | Newick                | 4    | FastTree from the alignment above                                                                                                                                                      |
| `kinase-pocket-metadata.json` | JSON (`treeMetadata`) | 1    | Each row's kinase group (AGC/CAMK/CK1/CMGC/NEK/RGC/STE/TKL/TK/Other) and UniProt accession from the `pkinfam.txt` list, which the tree's node-info dialog reads in step 4              |
