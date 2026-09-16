# R protease tutorial data

The files the figures in [`docs/tutorials/r_protease_triad.md`](../../../../../docs/tutorials/r_protease_triad.md)
load, served at `gmod.org/JBrowseMSA/demo/data/proteases/*`. All three come out
of one run of `docs/tutorials/scripts/build_r_protease_triad.R`, which reads
UniProt from R and computes the layers there.

| File                     | Format          | Provenance                                                                                                                                  |
| ------------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `proteases.aln`          | FASTA (aligned) | The peptidase S1 domain of 14 UniProtKB entries, cut at the domain bounds UniProt annotates and aligned with DECIPHER 3.4 `AlignSeqs`, 297 columns |
| `proteases.nh`           | Newick          | `ape::nj` on `DECIPHER::DistanceMatrix` of the alignment above, ladderized                                                                    |
| `proteases-layers.json`  | JSON            | The mean pairwise BLOSUM62 score per column, chymotrypsinogen's four intra-domain disulfide bonds as arcs, and a band on each catalytic residue |

The viewer loads the alignment and the tree by URL, and the tutorial's links
carry the layers inside the snapshot. The JSON file records what R computed, for
the figures' specs and for readers who want the numbers.
