# Norovirus GII recombination data

The files for the norovirus recombination tutorial, served at
`gmod.org/JBrowseMSA/demo/data/norovirus/*`. All of them come out of one run of
`docs/tutorials/scripts/build_norovirus_recombination.sh`, which fetches the
genomes and their GenBank records from NCBI and aligns them with MAFFT.

| File                 | Format          | Provenance                                                                                                                                         |
| -------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `noro-rows.tsv`      | TSV             | The row table: a label, an accession and the genotype the NCBI record carries, for twelve norovirus GII complete genomes                            |
| `noro.afa`           | FASTA (aligned) | The twelve genomes aligned with MAFFT 7.525 `--auto`, 7,778 columns                                                                                |
| `noro-orf1.nwk`      | Newick          | FastTree 2.2.0 `-nt -gtr` on the ORF1 columns of that alignment                                                                                    |
| `noro-orf2.nwk`      | Newick          | The same on the ORF2 columns                                                                                                                       |
| `noro-orfs.gff`      | GFF3            | The three CDS features of each GenBank record, in that genome's own coordinates, each with a `color=`                                               |
| `noro-parents.gff`   | GFF3            | Per row, 200-base windows colored by which of the two parent rows the window is closer to; the score column holds the difference in percent identity |
| `noro-junction.afa`  | FASTA (aligned) | Columns 4,838-5,437 of `noro.afa`, 300 either side of the first base of ORF2                                                                        |
| `noro-layers.json`   | JSON            | The four sliding-window identity tracks over that cut, the ORF columns and the breakpoint column; the source the figures' spec reads                |

The viewer loads the alignments, the trees and the GFFs by URL. The tutorial's
links carry the identity tracks inside the snapshot, so the viewer never loads
`noro-layers.json`.
