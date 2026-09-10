# Conservation mapped onto 3D structure

`seqPosToVisibleCol` and `visibleColToSeqPos` are already a documented
cross-repo contract with jbrowse-plugin-protein3d. Pushing per-column
conservation _into_ the structure coloring is a figure nobody else ships, and
the column ↔ residue half of the coordinate math is done.

The other half is not. Which alignment row a structure belongs to, and which of
its residues a row position lands on, is guessed at hover time by exact sequence
equality and falls back to a 1:1 map when the guess fails — see
[alignment-structure-mapping-layer](alignment-structure-mapping-layer.md), which
turns that guess into a snapshot layer. Colors pushed through the current anchor
would be wrong for any structure whose sequence does not match the row's
exactly, which is most experimental entries.

The sequence logo track's per-column information content is the same number, so
"color the structure by information content" is the same wiring with a different
input.
