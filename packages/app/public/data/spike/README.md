# Spike structure tutorial data

The files the figures in [`docs/tutorials/spike_structure.md`](../../../../../docs/tutorials/spike_structure.md)
load, served at `gmod.org/JBrowseMSA/demo/data/spike/*`. All five come out of
one run of `docs/tutorials/scripts/build_spike_structure.sh`, which prints every
number the page quotes.

| File                | Format                 | Step | Provenance                                                                                                                                                                                                   |
| ------------------- | ---------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `spike-rows.tsv`    | TSV                    | 1    | The row table: NCBI protein accession, row label, UniProtKB entry where one exists                                                                                                                           |
| `spike.afa`         | FASTA (aligned)        | 3    | Eleven coronavirus spike glycoproteins from NCBI efetch, aligned with `mafft --auto` (L-INS-i), 1660 columns                                                                                                 |
| `spike.nwk`         | Newick                 | 4    | `FastTree -lg` on the alignment above                                                                                                                                                                        |
| `spike-domains.gff` | GFF3 (domains)         | 5    | InterPro 110.0 precomputed Pfam matches (`react-msaview-cli interpro`) for the 8 rows whose UniProt entry is the same sequence as the row                                                                    |
| `spike-layers.json` | JSON (snapshot layers) | 6-7  | `highlights` from the P0DTC2 feature table (step 6), `residueMappings` from SIFTS plus PDBe polymer coverage for 6VXX chain A and the coverage text track derived from it (step 7)                            |

No filehandle loads `spike-layers.json`. The figures' `#data=` links carry its
three layers inline, and the file is hosted so the page can cite it and
`scripts/screenshots/tutorial-specs/spike_structure.mjs` can read it.
