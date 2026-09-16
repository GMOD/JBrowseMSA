# Mitogenome genes tutorial data

The files the figures in [`docs/tutorials/mitogenome_genes.md`](../../../../../docs/tutorials/mitogenome_genes.md)
load, served at `gmod.org/JBrowseMSA/demo/data/mitogenome/*`. All five come out
of one run of `docs/tutorials/scripts/build_mitogenome_genes.sh`, which prints
every number the page quotes.

| File                 | Format          | Step        | Provenance                                                                                                                                              |
| -------------------- | --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mito-rows.tsv`      | TSV             | The genomes | The row table: RefSeq accession and the row label it becomes                                                                                            |
| `mito-unaligned.afa` | FASTA (padded)  | 1           | The same eight genomes as fetched, right-padded to 17,019 columns, so the viewer opens them before the aligner runs                                     |
| `mito.afa`           | FASTA (aligned) | 2           | Eight mammal mitochondrial genomes from NCBI efetch, aligned with ClustalW, 17,966 columns                                                              |
| `mito.nwk`           | Newick          | 2           | ClustalW neighbor-joining tree from the alignment above                                                                                                 |
| `mito-genes.gff`     | GFF3 (genes)    | 3           | RefSeq's own GFF3 per accession, reduced to 37 genes per genome with `Name=` and `complex=`, plus a control region per genome carrying `color=255,205,0` |
