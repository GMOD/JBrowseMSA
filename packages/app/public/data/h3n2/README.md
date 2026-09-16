# H3N2 drift tutorial data

The files the figures in [`docs/tutorials/notebook_flu_drift.md`](../../../../../docs/tutorials/notebook_flu_drift.md)
load, served at `gmod.org/JBrowseMSA/demo/data/h3n2/*`. All three come out of
one run of `docs/tutorials/scripts/build_flu_drift.py`, which fetches the
records from NCBI and computes the drift track with numpy.

| File               | Format          | Provenance                                                                                                                             |
| ------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `h3n2-ha.aln`      | FASTA (aligned) | The hemagglutinin of 25 H3N2 vaccine strains, 1968 to 2022, GenBank protein records aligned with ClustalW 2.1, 567 columns             |
| `h3n2-ha.nh`       | Newick          | Biopython `DistanceTreeConstructor().nj` on a BLOSUM62 distance matrix, rooted on the 1968 strain                                      |
| `h3n2-layers.json` | JSON            | How often each column changed from one vaccine strain to the next, and a band on each of antigenic site B and the HA2 fusion peptide   |

The viewer loads the alignment and the tree by URL, and the tutorial's links
carry the layers inside the snapshot. The JSON file records what the notebook
computed, for the figures' specs and for readers who want the numbers.
