# Hemoglobin subunit interface data

The files the figures in [`docs/tutorials/protein_complex.md`](../../../../../docs/tutorials/protein_complex.md)
load, served at `gmod.org/JBrowseMSA/demo/data/hemoglobin/*`. All of them come
out of one run of `docs/tutorials/scripts/build_protein_complex.sh`, which
fetches the sequences from NCBI and the structure from RCSB.

| File                       | Format          | Provenance                                                                                                                                     |
| -------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `hemoglobin-rows.tsv`      | TSV             | The row table: a label, then the RefSeq proteins for the alpha and the beta subunit of eleven vertebrates                                        |
| `hemoglobin.afa`           | FASTA (aligned) | Alpha and beta aligned on their own with ClustalW 2.1 and concatenated per species, 290 columns; the `Human` row is NP_000549.1 then NP_000509.1 |
| `hemoglobin.nwk`           | Newick          | ClustalW neighbor joining on the concatenation                                                                                                 |
| `hemoglobin-subunits.gff`  | GFF3            | The alpha and the beta span of every row, in that row's residue numbering, each with a `color=`                                                |
| `hemoglobin-layers.json`   | JSON            | The residue pairs in contact between chain A and chains B and D of PDB 2HHB as an arc track, a residue-class text track, and the two chain mappings of the Human row |

The viewer loads the alignment, the tree and the GFF by URL. The tutorial's
links carry the arc track, the text track and the residue mappings inside the
snapshot, so the viewer never loads `hemoglobin-layers.json`; the file is the
source the figures' specs read.
