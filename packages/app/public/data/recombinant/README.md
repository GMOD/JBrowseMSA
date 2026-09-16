# Recombination breakpoint tutorial data

The files the figures in [`docs/tutorials/recombination_breakpoint.md`](../../../../../docs/tutorials/recombination_breakpoint.md)
load, served at `gmod.org/JBrowseMSA/demo/data/recombinant/*`. All of them come
out of one run of `docs/tutorials/scripts/build_recombination_breakpoint.sh`,
which fetches the genomes and the reference annotation from NCBI and prints
every number the page quotes.

| File                        | Format          | Step | Provenance                                                                                                                                       |
| --------------------------- | --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `recombinant-rows.tsv`      | TSV             | 1    | The row table: the label the viewer draws, the GenBank accession, and the Pango lineage NCBI Virus assigns it                                    |
| `recombinant.afa`           | FASTA (aligned) | 3    | Five whole SARS-CoV-2 genomes from NCBI efetch, aligned with ClustalW 2.1, 29,903 columns, one per base of the NC_045512.2 row                   |
| `recombinant.nwk`           | Newick          | 3    | ClustalW neighbor joining on the alignment; it serves both alignment files, whose rows carry the same names                                      |
| `recombinant-genes.gff`     | GFF3            | 4    | The 11 genes of the NC_045512.2 annotation plus the RBD and the RBM, projected through the alignment into every row's own coordinates            |
| `recombinant-rbd.afa`       | FASTA (aligned) | 5    | The receptor-binding domain, NC_045512.2 22,553-23,146, cut out of `recombinant.afa`                                                             |
| `recombinant-layers.json`   | JSON            | 5    | The four `bar` tracks the scan produces over that window, plus the breakpoint interval and the spike coordinates the figures' callouts anchor on |

The viewer loads the two alignments, the tree and the GFF by URL. The tutorial's
links carry the bar tracks inside the snapshot, so the viewer never fetches
`recombinant-layers.json`; the file is the source the figures' spec reads.
