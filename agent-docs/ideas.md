# Ideas / backlog

Captured for later, not yet required. An idea that needs more than a few
paragraphs — a measurement, a comparison, a design argument — gets its own file
in `ideas/` instead:

- [Neighbor joining past ~400 sequences](ideas/neighbor-joining-scaling.md) —
  the join loop is cubic; why `@gmod/hclust`'s fix for the same shape does not
  port, and what does.

## Color rows by group / annotation (publication-style figures)

The viewer colors residues by scheme (per-letter or per-column stats) but has no
way to shade **rows** by a group label — e.g. the yellow/blue/grey clade bands
in comparative-genomics figures like MyD88 in PMC10162675. `relativeTo`
reproduces the identity-dots half of that figure style; a row-group color track
would reproduce the clade-background half and make one-to-one paper figures
possible.

Sketch: let a row carry a group/category (from tree clade, a metadata column, or
an explicit map) and tint that row's background (tree label + alignment row) by
group color, with a small legend. Reuse the existing color infrastructure in
`packages/lib/src/colorSchemes.ts` / `useColorContrast.ts`.

## Phylogeny quality

- The example trees are ClustalW neighbor-joining (fast, deterministic, fine for
  illustration). Document/support an optional upgrade path to MAFFT/MUSCLE +
  IQ-TREE/FastTree for publication-grade trees in `scripts/examples-gen`.

## Code review backlog (noted, deferred)

From a repo-wide review pass. Real but lower-priority or judgment calls.

### The domain legend is NOT clipped, and this is here so nobody re-opens it

A long-running claim downstream in JBrowse held that `DomainLegend.tsx` gets cut
off by the view's fixed height once an alignment carries more distinct CDD
domains than fit, and that the fix was to scroll or cap it. Measured on a real
page (a twelve-row NLRP1 ortholog alignment, 18 legend entries, MsaView under an
LGV in a 878px viewport) it is none of those things:

- `maxHeight: '60%'` resolves. The Paper is 330px, which is 60% of the 550px
  `MSAPanel` wrapper. Percentage max-height does resolve against a positioned
  ancestor even when that ancestor's own height is content-derived, because the
  Paper is absolutely positioned.
- Nothing clips it. Paper bottom 813, nearest `overflow: hidden` ancestor bottom
  855, and zero legend rows fall past that edge.
- The inner `overflow: 'auto'` div really does scroll: `clientHeight` 296
  against `scrollHeight` 313.

So the component behaves as designed. What it looks like is a scrollable list
whose last row is half-visible, and in a **screenshot** that is
indistinguishable from truncation, which is where the claim came from. Raising
the embedding frame does not help, correctly: the legend is sized off the view,
not the page.

If the last entries should be readable without scrolling, that is a design
change (a taller cap, a wider two-column key, or drawing the key outside the
alignment area), not a bug fix, and it should be argued on its own merits.

### InterPro domain box stacking overflow

`renderBoxFeatureCanvasBlock.ts` draws stacked sub-feature boxes at a hardcoded
4px each (`h = subFeatureRows ? 4 : rowHeight`). A sequence with more than
`rowHeight / 4` InterPro entries overflows past the row bottom into the
neighbor. Dividing by `entry.length` would fit them but can make boxes invisibly
thin — needs a min-height + scroll/clamp design decision, not a one-liner.

### useWheelScroll shared rAF flag

`useWheelScroll.ts` uses one `scheduled` ref for both the wheel handler and the
drag-mousemove handler. They're mutually exclusive in practice (you don't wheel
mid-drag), so no live bug, but the coupling is fragile — separate flags or a
documented assumption would be safer.

(The "duplicated FASTA defline parsing" and "parseNewick return type uses `any`"
entries that used to sit here are both done — `splitFastaRecords` in
`msa-parsers/src/msa/fastaRecords.ts` and a typed `parse(s): NewickNode`.)

---

## From a repo-shape pass (2026-08-18)

The sequence logo track came out of this pass. What's left, in the order I'd
argue for it.

### A selection model — the one that unblocks the grant

The model tracks `mouseCol` and `mouseClickPos` but has no notion of a selected
column range or row set. That absence is the reason the MSA editor in
`dna-msa-comparative-genomics.md` cannot start: you cannot drag an exon boundary
before you can select one. It is a prerequisite, not a feature request.

Sketch: `selectedColumns: {start, end} | undefined` and `selectedRows` on the
model, a drag-to-select gesture on the alignment canvas (the hit-testing already
exists in `useMsaBlockMouse.ts`), and a band drawn by the same overlay machinery
`highlightColumns` uses. Persist both in the snapshot so a selection is
shareable, exactly as `highlightColumns` already is.

What lands on top of it, cheapest first:

- copy the selected block as FASTA (`SequenceTextArea.tsx` already renders
  sequence text; `getUngappedSequence` already exists)
- zoom-to-selection, and trim-to-selection as a view filter
- export only the selected columns (the SVG export already takes an
  `exportType`, so this is a third mode)
- then the editor: drag a boundary, recompute through the columns, write back —
  which is the read-only projection in `packages/cli/src/genestructure.ts` run
  in reverse

### Find / search — the most-missed everyday feature

There is no search of any kind: no row-name search, no "jump to column N", no
motif or regex or IUPAC pattern search. `featureFilters` filters annotation
_types_, not rows, so nothing covers this. It is the first thing a user reaches
for on a 230k-row tree.

The overlay to show hits already exists and already persists — a motif hit
becomes a shareable link via `highlightColumns` for free. Row-name search wants
to reuse `showOnly`/`collapsed` rather than invent a third row-visibility
mechanism.

### Conservation mapped onto 3D structure

`seqPosToVisibleCol` / `visibleColToSeqPos` are already a documented cross-repo
contract with jbrowse-plugin-protein3d, and `website/src/lib/proteinStl.ts`
already fetches AlphaFold PDBs in the browser. Pushing per-column conservation
_into_ the structure coloring is a figure nobody else ships and the coordinate
math is done. Related: the logo track's per-column information content is the
same number, so "color the structure by information content" is the same wiring.

### Demos

- **Load by accession.** A Pfam/Rfam/InterPro accession box that pulls the
  family alignment from EBI — "try it on your own family" with no file handling.
  Rfam pays double: its Stockholm carries tree and secondary structure inline,
  exercising a path that is supported but barely demoed.
- **Codon-aware DNA view.** The F12 figure proves the projection math, but
  nothing in the UI reads a DNA alignment _as codons_ — translate a row, color
  by synonymous vs non-synonymous, step the ruler by 3. This is the demo that
  sells rung 1 of the comparative-annotation frame.

### Consolidate the four protein-link generators

`scripts/{src,braf,tp53,tp53-protein3d}-protein-link/generate.mjs` are ~740 LOC
doing one thing four times: tabix the same public RefSeq GFF, build
`connectedFeature`, assemble a JBrowse session spec, print the URL. Their own
headers say so ("Like the SRC/BRAF scripts…"). One generator plus four config
objects (transcript, region, query row, highlight) is ~200 LOC.

`scripts/screenshots/` has the same shape — five entry points (`generate`,
`generate-screenshots`, `jbrowse-figures`, `f12-combined-figure`,
`f12-genome-figure`) over a shared `lib.mjs`.

### Generated intermediates are committed

`scripts/*/work/` and `scripts/examples-gen/build/` hold generated `.aln`,
`.dnd`, `.afa` and `.vcf` files in git. `examples-gen/datasets/` (the real
inputs) plus the generator is the reproducible pair; `build/` is output. Worth a
`.gitignore` and a note in the generator READMEs — but check first whether any
of them is load-bearing for a figure that CI regenerates, since `pnpm figures`
and `pnpm screenshots` are diff-gated.
