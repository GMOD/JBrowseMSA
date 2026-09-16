# H5N1 surveillance figure data

The files the figures in [`docs/tutorials/influenza_surveillance_figure.md`](../../../../../docs/tutorials/influenza_surveillance_figure.md)
load, served at `gmod.org/JBrowseMSA/demo/data/h5n1/*`. All three come out of one
run of `docs/tutorials/scripts/build_influenza_surveillance_figure.py`, which
fetches Nextstrain's `avian-flu/h5n1-cattle-outbreak/genome` build pinned to
2026-09-15 and subsamples it to every 24th tip that names a GenBank accession
and a collecting state.

| File                 | Format          | Provenance                                                                                                                                             |
| -------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `h5n1-ha.fa`         | FASTA (aligned) | The HA coding sequence of 204 genomes reconstructed from the build's root sequence and per-branch mutations, 1,707 columns                              |
| `h5n1.nwk`           | Newick          | The build's own topology pruned to the 204 tips, branch lengths from the difference in cumulative divergence                                            |
| `h5n1-rowdata.json`  | JSON            | The row table: genotype, host, state, year and cleavage site per tip, plus one amino-acid site per segment (PB2 670, PB1 517, PA 432, HA 147, NP 119, NA 71, M1 82, NS1 67) |

The build is assembled from GenBank and SRA, so the sequences here can be
redistributed. The per-segment builds that carry a GenoFLU lineage per tip draw
on GISAID as well, whose database access agreement does not allow that.
