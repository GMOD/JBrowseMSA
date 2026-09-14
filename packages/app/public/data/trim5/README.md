# TRIM5 codon selection data

Served at `gmod.org/JBrowseMSA/demo/data/trim5/*`. Built by
[`docs/tutorials/scripts/build_codon_selection.sh`](../../../../../docs/tutorials/scripts/build_codon_selection.sh);
see [`docs/tutorials/codon_selection.md`](../../../../../docs/tutorials/codon_selection.md)
for what each step does. The dN/dS bar track and the labeled highlights are
small enough to inline in the `?data=` snapshot directly (`trim5-dnds-values.json`
is what gets inlined, hosted here too so the numbers are inspectable on their
own), so only the alignment and the exon structure are loaded from a file.

| File               | Format            | Provenance                                                                                                                              |
| ------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `trim5-cds.stock`  | Stockholm (tree)  | 32 TRIM5 coding-sequence orthologs (NCBI Datasets ortholog set for GeneID 85363), codon-aligned with MACSE, tree (`#=GF NH`) from FastTree on the translated alignment |
| `trim5-exons.gff`  | GFF3 (gene structure) | 7-exon coding structure of `NM_033034.3` projected onto every row (`react-msaview-cli genestructure --gene-id 85363 --transcript NM_033034.3 --ref human`) |
| `trim5-dnds-values.json` | JSON array (1800 numbers) | Per-column dN/dS (HyPhy FEL β/α, one alignment codon repeated over its 3 nucleotide columns, clamped to 5), the `columnTracks` bar values in the snapshots below |
