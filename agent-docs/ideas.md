# Ideas / backlog

These ideas are captured for later and not yet required. Each idea gets its own
file in `ideas/`, listed below with a one-line summary to help decide whether it
is worth an afternoon. Add a new one by writing the file and adding a line here.

Ideas we have argued against are in `ideas/closed/`, each with the argument, so
nobody has to work it out again.

## Open, roughly in the order I would argue for them

- [Layers that take data](ideas/data-layers.md): the viewer as an agent's render
  target. `columnTracks`, `highlights`, GFF `color=`, row strips, `rowTint`,
  `export-svg --spec` and the `customColorScheme` letter map shipped; a JSON
  `features` field remains.
- [A selection model](ideas/selection-model.md): the model has no selected
  column range or row set, and the MSA editor needs one before anything else.
  Copy, zoom-to-selection and selective export all build on it.
- [Conservation on 3D structure](ideas/conservation-on-structure.md): color a
  structure by column conservation. The standalone structure page is the cheap
  first step; in JBrowse the hop goes through the genome, as protein3d's hover
  does.
- [Demo: load by accession](ideas/load-by-accession-demo.md): a Pfam/Rfam box
  that loads a family alignment from EBI with no file handling.
- [Demo: codon-aware DNA view](ideas/codon-aware-dna-view.md): translate a row,
  color synonymous and non-synonymous changes, and step the ruler by 3.
- [Consolidate the protein-link generators](ideas/consolidate-script-generators.md):
  658 LOC doing one thing four times; one generator plus four configs is ~200.
- [Neighbor joining past ~400 sequences](ideas/neighbor-joining-scaling.md): the
  join loop is cubic. The file explains why `@gmod/hclust`'s fix for the same
  loop does not port, and what does.

## Shipped, kept for the reasoning

- [Panels and marks](ideas/panels-and-marks.md): the row and column scales, the
  marks, channels and scales vocabulary, and the eleven steps behind `rowData`,
  `encodings`, `clades`, `rowPanels` and the tree overview, all shipped
  2026-09-16. It replaced the ggtree-style figures plan.
- [Ortholog sources beyond NCBI](ideas/ortholog-sources-beyond-ncbi.md):
  measurements of nine ortholog sources, and why jbrowse-plugin-msaview took
  PANTHER, then UniRef, and rejected Ensembl and OrthoDB.
- [The alignment ↔ structure correspondence as a layer](ideas/alignment-structure-mapping-layer.md):
  the `residueMappings` layer, its lookups and
  `react-msaview-cli residue-mappings`. protein3d dropped its sequence-matching
  bridge for a path through the genome, so the layer serves pages with no genome
  view.

## Closed

- [Annotation legend clipping](ideas/closed/domain-legend-clipping.md): measured
  on a real page, the legend scrolls. The report came from a screenshot showing
  a half-visible last row.
- [Generated intermediates in git](ideas/closed/committed-generated-intermediates.md):
  already fixed. The `.gitignore` files landed and git tracks none of the
  intermediates.
- [Publication-grade trees in examples-gen](ideas/closed/publication-grade-phylogeny-pipeline.md):
  the README documents the ClustalW tradeoff, and wiring MAFFT/IQ-TREE into the
  generator is not worth adding the binaries.
- [useWheelScroll's shared rAF flag](ideas/closed/usewheelscroll-shared-raf-flag.md):
  a contended frame loses no drag delta, so no fix is needed.
- [Precomputed alignments for mouse, fly and worm](ideas/closed/multi-assembly-alignments.md):
  the gene explorer that would have read them is gone, replaced by jb2hubs'
  `/protein-browser`.
- [WebGL/GPU rendering for the MSA canvas](ideas/closed/webgl-rendering.md): a
  glyph atlas measured 2-3x slower than `fillText`, and the raster tile cache
  already makes zoom cost independent of column width.

Done and removed: duplicated FASTA defline parsing (now `splitFastaRecords` in
`msa-parsers/src/msa/fastaRecords.ts`), `parseNewick` returning `any` (now a
typed `parse(s): NewickNode`), the sequence logo track, row search and jump to
column (the header's Go to box; motif search is an agent's job under
data-layers), row-group coloring (now the `rowTint` encoding), and InterPro
sub-row boxes overflowing the row (the lanes now share out the row height).
