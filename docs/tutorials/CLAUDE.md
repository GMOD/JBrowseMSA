Tutorials here follow the same rules as jbrowse-components'
`website/docs/tutorials/CLAUDE.md`, which carries the reasoning. Read it before
writing one. This file names what differs, and what a page in this repo needs.

Each step gets a figure, each caption describes what is in the frame, and the
prose stays short. Use no em-dashes anywhere, including code comments. Follow
`docs/WRITING.md`.

## The shape

A tutorial is **one continuous line of work**: sequences to alignment to tree to
the layers an analysis produces, ending on a `?data=` link that opens the
result. Each step consumes what the step before produced. One dataset is the
default; a second only where the first raised the question it answers.

**Every dataset carries a built-in control**, something in the same figure that
ought to come out negative, and the page ends by checking the inference against
the raw data.

The analysis happens outside the viewer (see `viewer-not-analysis-tool` and
`docs/layers.md`). The page shows the command that produces each file the viewer
loads, in a form a reader runs on their own data; everything else lives in
`scripts/build_<topic>.sh`, which `## Reproduce it end to end` curls from GitHub
and runs. Every number in the prose is one a run of that script printed.

A pipeline that runs inside a language ships that language's script instead,
`build_<topic>.R` or `build_<topic>.py`, and the reproduce section runs it with
`Rscript` or `python`. The page's own snippets are the same code the script
runs, so a reader following along and a reader running the script get the same
files.

Section order: opening paragraph, `## Prerequisites`,
`## Where the data comes from` (one bullet per file, ending in the raw URL), the
steps, `## Reproduce it end to end`, `## See also` (bare links),
`## References`.

**Don't argue and don't preach.** Stop a section at the observation. No thesis
paragraph, no naming a wrong inference to refute it, no "the honest result".
Gene symbols are `_italic_` in prose and bare in captions and headings.

## Figures

A figure is a linked image followed by its caption paragraph; `wrapFigures` in
`website/astro.config.mjs` turns the pair into a `<figure>`:

```md
[![](../media/<topic>-<step>.png)](https://gmod.org/JBrowseMSA/demo/?data=...)

Caption: what the frame shows, in the frame's own terms.
```

The link opens the exact view the figure captured. Every figure is generated:

- a spec module per tutorial at `scripts/screenshots/tutorial-specs/<topic>.mjs`
  exporting `specs` (same shape as `specs.mjs`; `fileSnap` comes from
  `snap.mjs`), named `<topic>-<step>` so `--filter=<topic>` selects the page
- callouts (`annotate`) anchor on alignment columns and rows, never pixels; see
  `annotations.mjs`
- `node scripts/screenshots/generate.mjs --filter=<topic> --port=<free port>`
  after `pnpm --filter app build`

Traps the existing pages hit:

- **A callout anchor counts from 0**, where `highlights` and GFF count from 1.
  The same residue is two different numbers in the two files.
- **Row order is not the Newick file's order.** The `root` getter ladderizes by
  clade size and sorts the smaller subtree last, so a `scrollY` computed from
  the tree file lands somewhere else. Read the row index off
  `window.MSAVIEW_MODEL` instead.
- **An anchor that resolves can still draw off-canvas**, and nothing reports it.
  A collapsed clade outside the captured window is the usual way in, so look at
  every figure you ship.
- **`generate.mjs` serves `packages/app/dist`.** A file added or rewritten under
  `packages/app/public/data/` reaches a figure only after
  `pnpm --filter app build`, and until then the capture uses the copy from the
  last build with no warning.
- **The aligner decides the row order of its output.** ClustalW writes the rows
  in guide-tree order, so a series a reader should read in file order (by year,
  by accession) needs the file rewritten in that order after the aligner runs.
- **A tip label elides by tree depth, not label length.** `treeAreaWidth` has to
  clear the deepest row's indent plus its label, so a set of long names elides
  the rows furthest from the root while the shallow ones fit. Nothing reports
  it, and a half-drawn label reads as a whole one until you compare two rows.
- **A callout anchored `alignY: 'bottom'` draws below the drawn rows**, which is
  off the bottom of `clip: 'viewer'` whenever the rows fill the panel. The
  anchor resolves, so the unresolved-anchor guard stays quiet and the PNG comes
  out with no callout. Give `height` a band under the last row.

Hosted files the links load go under `packages/app/public/data/<topic>/`, served
at `gmod.org/JBrowseMSA/demo/data/<topic>/`, with a row in that directory's
`README.md`. Keep them small; a large public file that already sends
`Access-Control-Allow-Origin` (the InterPro API, NCBI eutils, PDBe) is loaded
from its source instead of rehosted.

Registering a page is a file here plus an entry in
`website/src/lib/tutorials.ts`.
