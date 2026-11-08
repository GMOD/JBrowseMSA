Read `agent-docs/reference/writing-tutorials.md` before writing a tutorial.

Each of these produces a wrong figure with no warning:

- **A callout anchor counts from 0**, where `highlights` and GFF count from 1.
- **Read a row index off `window.MSAVIEW_MODEL`, not the Newick file.** The
  default `treeOrder` is `branchLength`, which puts each node's shortest branch
  first, so a `scrollY` computed from the tree file lands elsewhere.
- **Look at every figure you ship.** An anchor that resolves can still draw
  off-canvas, usually via a collapsed clade outside the captured window.
- **Run `pnpm --filter app build` after changing `packages/app/public/data/`.**
  `generate.mjs` serves `packages/app/dist`, so until then the capture uses the
  last build's copy.
- **Rewrite an aligner's output in reading order** when the rows should read in
  file order (by year, by accession); ClustalW writes guide-tree order.
- **Size `treeAreaWidth` for the deepest row's indent plus its label.** Labels
  elide by tree depth, so the rows furthest from the root lose theirs first
  while the shallow ones fit.
- **Give `height` a band under the last row for an `alignY: 'bottom'` callout.**
  It draws below the rows, off the bottom of `clip: 'viewer'` when the rows fill
  the panel, and the anchor still resolves.
