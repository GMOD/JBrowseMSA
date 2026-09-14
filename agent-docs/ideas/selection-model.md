# A selection model

The MsaView model tracks `mouseCol` and `mouseClickPos` but has no notion of a
selected column range or row set. Without one, the MSA editor sketched in
`../dna-msa-comparative-genomics.md` (the grant) cannot start, since a user has
to select an exon boundary before dragging it.

Sketch: `selectedColumns: {start, end} | undefined` and `selectedRows` on the
model, a drag-to-select gesture on the alignment canvas using the hit-testing
that already exists in `useMsaBlockMouse.ts`, and a band drawn by the same
overlay code `highlightColumns` uses. Persist both in the snapshot so a
selection is shareable, exactly as `highlightColumns` already is.

## Features that build on it, cheapest first

- Copy the selected block as FASTA. `SequenceTextArea.tsx` already renders
  sequence text and `getUngappedSequence` already exists.
- Zoom-to-selection, and trim-to-selection as a view filter.
- Export only the selected columns. The SVG export already takes an
  `exportType`, so this would be a third mode.
- Then the editor: drag a boundary, recompute through the columns, and write the
  result back, which runs the read-only projection in
  `packages/cli/src/genestructure.ts` in reverse.
