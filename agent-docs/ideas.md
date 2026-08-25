# Ideas / backlog

Captured for later, not yet required. Each idea gets its own file in `ideas/`,
listed below with the hook that says whether it is worth your afternoon. Add a
new one by writing the file and adding a line here.

Ideas we have argued against live in `ideas/closed/`, with the argument. They
stay written down so nobody re-derives them from scratch.

## Open, roughly in the order I would argue for them

- [A selection model](ideas/selection-model.md) — no selected column range or
  row set exists, which is the single thing blocking the MSA editor. Copy,
  zoom-to-selection and selective export all land on top of it.
- [Find / search](ideas/find-and-search.md) — no row-name search, no jump-to-
  column, no motif search. The first thing a user reaches for on a 230k-row
  tree.
- [Color rows by group](ideas/row-group-coloring.md) — shade rows by clade or
  metadata, the half of publication figure style `relativeTo` does not cover.
- [Conservation on 3D structure](ideas/conservation-on-structure.md) — the
  coordinate contract with protein3d is already done; this is wiring.
- [Ortholog sources beyond NCBI](ideas/ortholog-sources-beyond-ncbi.md) — NCBI
  has no orthologs for yeast, worm or plant genes, so the gene explorer's
  cross-species alignment fails for four of its seven species. PANTHER measured
  as the fix, OMA the fallback, Ensembl and OrthoDB rejected with numbers;
  prototype in `website/src/lib/orthologs/panther.ts`.
- [Demo: load by accession](ideas/load-by-accession-demo.md) — a Pfam/Rfam box
  that pulls a family alignment from EBI, no file handling.
- [Demo: codon-aware DNA view](ideas/codon-aware-dna-view.md) — translate a row,
  color synonymous vs non-synonymous, step the ruler by 3.
- [InterPro box stacking overflow](ideas/interpro-box-stacking-overflow.md) — a
  hardcoded 4px per sub-feature overflows into the next row past ~10 entries.
  Needs a min-height decision, not a one-liner.
- [Consolidate the protein-link generators](ideas/consolidate-script-generators.md)
  — 738 LOC doing one thing four times; one generator plus four configs is ~200.
- [Precomputed alignments for mouse, fly and worm](ideas/multi-assembly-alignments.md)
  — `build-data.mjs` already builds them; host the files and swap the species'
  on-demand alignment for a one-read hosted one, `.cds` and all.
- [Neighbor joining past ~400 sequences](ideas/neighbor-joining-scaling.md) —
  the join loop is cubic; why `@gmod/hclust`'s fix for the same shape does not
  port, and what does.

## Closed

- [The annotation legend is NOT clipped](ideas/closed/domain-legend-clipping.md)
  — measured on a real page. It scrolls; a half-visible last row in a screenshot
  is what the claim was.
- [Generated intermediates in git](ideas/closed/committed-generated-intermediates.md)
  — already fixed. The `.gitignore` files landed and nothing is tracked.
- [Publication-grade trees in examples-gen](ideas/closed/publication-grade-phylogeny-pipeline.md)
  — the README documents the ClustalW tradeoff; wiring MAFFT/IQ-TREE into the
  generator is not worth the binaries.
- [useWheelScroll's shared rAF flag](ideas/closed/usewheelscroll-shared-raf-flag.md)
  — a contended frame loses no drag delta, so there is nothing to fix.

Done and removed: duplicated FASTA defline parsing (now `splitFastaRecords` in
`msa-parsers/src/msa/fastaRecords.ts`), `parseNewick` returning `any` (now a
typed `parse(s): NewickNode`), and the sequence logo track.
