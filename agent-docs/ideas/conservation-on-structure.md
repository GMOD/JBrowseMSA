# Conservation mapped onto 3D structure

`seqPosToVisibleCol` and `visibleColToSeqPos` are already a documented
cross-repo contract with jbrowse-plugin-protein3d, and
`website/src/lib/proteinStl.ts` already fetches AlphaFold PDBs in the browser.
Pushing per-column conservation _into_ the structure coloring is a figure nobody
else ships, and the coordinate math is done.

The sequence logo track's per-column information content is the same number, so
"color the structure by information content" is the same wiring with a different
input.
