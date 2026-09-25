# A selection model

**The selection shipped 2026-09-25. Trim, selective export and the editor
remain.**

The MsaView model holds `selection`: columns `start` to `end` of the file,
1-based and inclusive like a column highlight, and `rows` by name, every row
where `rows` is absent. The property persists in the snapshot and the `#data=`
link, and `docs/layers.md` documents it as a layer. A shift-drag on the
alignment selects a block, and a drag along any track selects columns across
every row. The header then shows the block's size as a button whose menu copies
the block as FASTA, zooms to it or clears it. `MSAViewer` takes a `selection`
prop and reports changes through `onSelectionChange`, R takes `selection =` and
`geom_msa_selection()`, and Python has a two-way `selection` trait.

The MSA editor sketched in `../dna-msa-comparative-genomics.md` (the grant)
needs this selection first, since a user has to select an exon boundary before
dragging it.

## What builds on it next, cheapest first

- Trim-to-selection as a view filter: hide every column outside the selection
  the way `hideGaps` hides gappy ones.
- Export only the selected columns. The SVG export already takes an
  `exportType`, so this would be a third mode.
- Then the editor: drag a boundary, recompute through the columns, and write the
  result back, which runs the read-only projection in
  `packages/cli/src/genestructure.ts` in reverse.
