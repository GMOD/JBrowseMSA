# Ideas / backlog

These ideas are captured for later and not yet required. Each idea gets its own
file in `ideas/`, listed below with a one-line summary to help decide whether it
is worth an afternoon. Add a new one by writing the file and adding a line here.

Ideas we have argued against are in `ideas/closed/`, each with the argument, so
nobody has to work it out again.

## Open, roughly in the order I would argue for them

- [Layers that take data](ideas/data-layers.md): the viewer as an agent's render
  target, with column tracks from values, labeled highlights in residue
  coordinates, colored GFF features and row strips from metadata. Several items
  below change as a result, since an agent can compute them and store the result
  in the snapshot for the viewer to draw. `columnTracks` and `highlights`
  shipped; GFF color, row strips, and `export-svg` from a snapshot remain.
- [A selection model](ideas/selection-model.md): the model has no selected
  column range or row set, and the MSA editor needs one before anything else.
  Copy, zoom-to-selection and selective export all build on it.
- [Find / search](ideas/find-and-search.md): the viewer has no row-name search,
  no jump-to-column and no motif search, which a user needs on a 230k-row tree.
- [Color rows by group](ideas/row-group-coloring.md): shade rows by clade or
  metadata, the part of publication figure styling that `relativeTo` does not
  cover.
- [The alignment ↔ structure correspondence as a layer](ideas/alignment-structure-mapping-layer.md):
  protein3d anchors a structure to its MSA row by exact sequence equality and
  falls back to a wrong 1:1 map, with no warning, when that fails. Make the
  correspondence a snapshot layer, and give highlights an owner so two sync
  sources stop overwriting each other. The item below depends on it.
- [Conservation on 3D structure](ideas/conservation-on-structure.md): the column
  ↔ residue half of the contract with protein3d is done; the row ↔ structure
  half still relies on the sequence-equality match above.
- [Ortholog sources beyond NCBI](ideas/ortholog-sources-beyond-ncbi.md): NCBI
  has no orthologs for yeast, worm or plant genes, so the gene explorer's
  cross-species alignment fails for four of its seven species. Measurements
  favor PANTHER, with OMA as the fallback, and the file rejects Ensembl and
  OrthoDB with numbers. The prototype is in
  `website/src/lib/orthologs/panther.ts`.
- [Demo: load by accession](ideas/load-by-accession-demo.md): a Pfam/Rfam box
  that loads a family alignment from EBI with no file handling.
- [Demo: codon-aware DNA view](ideas/codon-aware-dna-view.md): translate a row,
  color synonymous and non-synonymous changes, and step the ruler by 3.
- [InterPro box stacking overflow](ideas/interpro-box-stacking-overflow.md): a
  hardcoded 4px per sub-feature overflows into the next row past ~10 entries.
  The fix needs a decision on minimum height.
- [Consolidate the protein-link generators](ideas/consolidate-script-generators.md):
  738 LOC doing one thing four times; one generator plus four configs is ~200.
- [Precomputed alignments for mouse, fly and worm](ideas/multi-assembly-alignments.md):
  `build-data.mjs` already builds them. Host the files, including `.cds`, and
  replace each species' on-demand alignment with a single read of the hosted
  one.
- [Neighbor joining past ~400 sequences](ideas/neighbor-joining-scaling.md): the
  join loop is cubic. The file explains why `@gmod/hclust`'s fix for the same
  loop does not port, and what does.

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
- [WebGL/GPU rendering for the MSA canvas](ideas/closed/webgl-rendering.md): a
  glyph atlas measured 2-3x slower than `fillText`, and the raster tile cache
  already makes zoom cost independent of column width.

Done and removed: duplicated FASTA defline parsing (now `splitFastaRecords` in
`msa-parsers/src/msa/fastaRecords.ts`), `parseNewick` returning `any` (now a
typed `parse(s): NewickNode`), and the sequence logo track.
