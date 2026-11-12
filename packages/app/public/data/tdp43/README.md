# TDP-43 AlphaFold confidence data

The files the figures in [`docs/tutorials/alphafold_confidence.md`](../../../../../docs/tutorials/alphafold_confidence.md)
load, served at `gmod.org/JBrowseMSA/demo/data/tdp43/*`. All of them come out of
one run of `docs/tutorials/scripts/build_alphafold_confidence.sh`, which fetches
the sequences from UniProt, the models from AlphaFold DB and the Pfam matches
from InterPro.

| File                   | Format          | Provenance                                                                                                                              |
| ---------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `tardbp-rows.tsv`      | TSV             | The row table: a label and the UniProtKB accession for TDP-43 in fourteen vertebrates                                                    |
| `tardbp.afa`           | FASTA (aligned) | ClustalW 2.1 over the fourteen UniProt sequences, 431 columns; the `Human` row is Q13148                                                 |
| `tardbp.nwk`           | Newick          | ClustalW neighbor joining on that alignment                                                                                             |
| `tardbp-rowdata.json`  | JSON            | Two fields per row: the mean pLDDT of its AlphaFold model and the number of its residues under pLDDT 50 |
| `tardbp-layers.json`   | JSON            | The mean pLDDT per column as a bar track, three rows' own pLDDT as strip tracks, the four Pfam matches of the human row as highlights, and the bar panel that reads `tardbp-rowdata.json`, each colored through AlphaFold DB's four pLDDT bands |

The viewer loads the alignment, the tree and the row table by URL. The
tutorial's links carry the tracks, the highlights and the row panels inside the
snapshot, so the viewer never loads `tardbp-layers.json`; the file is the source
the figures' specs read.
