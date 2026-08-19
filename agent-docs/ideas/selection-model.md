# A selection model — the one that unblocks the grant

The MsaView model tracks `mouseCol` and `mouseClickPos` but has no notion of a
selected column range or row set. That absence is why the MSA editor sketched in
`../dna-msa-comparative-genomics.md` cannot start: you cannot drag an exon
boundary before you can select one. It is a prerequisite, not a feature request.

Sketch: `selectedColumns: {start, end} | undefined` and `selectedRows` on the
model, a drag-to-select gesture on the alignment canvas — the hit-testing
already exists in `useMsaBlockMouse.ts` — and a band drawn by the same overlay
machinery `highlightColumns` uses. Persist both in the snapshot so a selection
is shareable, exactly as `highlightColumns` already is.

## What lands on top of it, cheapest first

- Copy the selected block as FASTA. `SequenceTextArea.tsx` already renders
  sequence text and `getUngappedSequence` already exists.
- Zoom-to-selection, and trim-to-selection as a view filter.
- Export only the selected columns. The SVG export already takes an
  `exportType`, so this is a third mode.
- Then the editor: drag a boundary, recompute through the columns, write back —
  which is the read-only projection in `packages/cli/src/genestructure.ts` run
  in reverse.
