# Gene neighborhoods tutorial data

The files the figures in [`docs/tutorials/gene_neighborhoods.md`](../../../../../docs/tutorials/gene_neighborhoods.md)
load, served at `gmod.org/JBrowseMSA/demo/data/neighborhoods/*`. All four come
out of one run of `docs/tutorials/scripts/build_gene_neighborhoods.sh`, which
prints every number the page quotes.

| File                    | Format          | Step | Provenance                                                                                                                                               |
| ----------------------- | --------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trp-rows.tsv`          | TSV             | 1    | The row list: twelve RefSeq genome accessions and the row label each becomes                                                                             |
| `trp-neighborhoods.gff` | GFF3 (genes)    | 1    | 176 genes from RefSeq's own GFF3 per genome, cut to 8 kb either side of trpB and turned so trpB points right, each with `Name=`, `role=` and `locus_tag=` |
| `trpB.afa`              | FASTA (aligned) | 2    | The twelve TrpB proteins from NCBI efetch, aligned with ClustalW, 423 columns                                                                            |
| `trpB.nwk`              | Newick          | 2    | ClustalW neighbor-joining tree from the alignment above                                                                                                  |
