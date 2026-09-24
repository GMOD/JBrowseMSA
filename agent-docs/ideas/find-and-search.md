# Find / search

The header's **Find row** box (`components/header/RowSearch.tsx`) autocompletes
row names and scrolls the chosen row to the middle of the alignment, and the
arrow keys, Home and End move through the columns. Two searches remain: jump to
column N, and a motif, regex or IUPAC pattern search.

A motif search is a computation, so under [data-layers](data-layers.md) an agent
runs it and pushes the hits as `highlights`, which persist in the snapshot and
travel with a shared link. Jump to column is navigation, and a box beside **Find
row** that takes a column or a `row:residue` pair would cover it through
`seqPosToVisibleCol`.
