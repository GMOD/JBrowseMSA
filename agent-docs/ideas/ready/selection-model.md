---
name: selection-model
description:
  The selection, the trim to it and its export shipped; the MSA editor builds on
  them next.
---

# A selection model

**The selection shipped 2026-09-25, and the trim and the selection export
2026-11-12. The editor remains.**

The MsaView model holds `selection`: columns `start` to `end` of the file,
1-based and inclusive like a column highlight, and `rows` by name, every row
where `rows` is absent. The property persists in the snapshot and the `#data=`
link, and `docs/layers.md` documents it as a layer. A shift-drag on the
alignment selects a block, and a drag along any track selects columns across
every row. The header then shows the block's size as a button whose menu copies
the block as FASTA, zooms to it or clears it. `MSAViewer` takes a `selection`
prop and reports changes through `onSelectionChange`, R takes `selection =` and
`geom_msa_selection()`, and Python has a two-way `selection` trait.

The MSA editor sketched in `../../handoffs/dna-msa-comparative-genomics.md` (the
grant) needs this selection first, since a user has to select an exon boundary
before dragging it.

`trimToSelection` hides every column outside the selection. The model's `blanks`
holds the gappy columns `hideGaps` hides together with the columns outside the
trim, and every conversion between file and visible columns reads it, so the
tracks, highlights, minimap, structure panel and export follow. The position
ruler, its tooltip and the "Find" box number file columns. The trim keeps every
row: hiding rows by name would prune the tree, and the row filter by a `rowData`
field is a separate transform. `MSAViewer` takes `trimToSelection`, and Python
`trim_to_selection`.

The SVG export's `exportType: 'selection'` crops to the block's columns and the
rows from the first selected to the last, and the export dialog offers it while
there is a selection. `react-msaview-cli export-svg --selection` draws it from a
spec.

## What builds on it next

The editor: drag a boundary, recompute through the columns, and write the result
back, which runs the read-only projection in `packages/cli/src/genestructure.ts`
in reverse.
