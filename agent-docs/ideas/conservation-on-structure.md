# Conservation mapped onto 3D structure

`seqPosToVisibleCol` and `visibleColToSeqPos` are already a documented
cross-repo contract with jbrowse-plugin-protein3d. The proposal pushes per-column
conservation _into_ the structure coloring, and the column ↔ residue half of the
coordinate math is done.

The row ↔ structure half is not. protein3d currently guesses at hover time which
alignment row a structure belongs to, and which of its residues a row position
lands on, by exact sequence equality, and falls back to a 1:1 map when the guess
fails. [alignment-structure-mapping-layer](alignment-structure-mapping-layer.md)
replaces that guess with a snapshot layer. Colors pushed through the current
anchor would be wrong for any structure whose sequence does not match the row's
exactly, which covers most experimental entries.

The sequence logo track's per-column information content is the same kind of
number, so coloring the structure by information content needs the same wiring
with a different input.
