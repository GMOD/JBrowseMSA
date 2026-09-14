# p53 variant-effect tutorial data

The files the figures in [`docs/tutorials/p53_variant_effects.md`](../../../../../docs/tutorials/p53_variant_effects.md)
load, served at `gmod.org/JBrowseMSA/demo/data/p53/*`. All three come out of one
run of `docs/tutorials/scripts/build_p53_variant_effects.sh`, which fetches the
sequences from NCBI and the variant effects from ClinVar, AlphaFold and MaveDB.

| File                   | Format          | Provenance                                                                                                                       |
| ---------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `p53-vertebrates.afa`  | FASTA (aligned) | 15 vertebrate p53 proteins, NCBI RefSeq, aligned with MAFFT 7.526 `--auto`. The `Human` row is NP_000537.3 (393 aa)               |
| `p53-vertebrates.nh`   | Newick          | FastTree 2.1.11 `-lg` on the alignment above                                                                                     |
| `p53-layers.json`      | JSON            | The three per-residue tracks over the Human row (ClinVar, AlphaMissense, MaveDB) plus the domain bands, as `MsaView` snapshot fields |

The viewer loads the alignment and the tree by URL. The tutorial's links carry
the `columnTracks` values inside the snapshot, so the viewer never loads
`p53-layers.json`. The file records where those values came from, for the
figures' specs and for readers who want the numbers.
