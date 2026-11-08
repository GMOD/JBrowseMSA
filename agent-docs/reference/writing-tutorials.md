# Writing a tutorial

`docs/tutorials/*.md` follow jbrowse-components'
`website/docs/tutorials/CLAUDE.md`, which carries the reasoning; this names what
differs here and what a page in this repo needs. `pnpm check:tutorials` (CI)
holds the section order, the opening's list, the data section's layout, the
reproduce section's list, bare See also links and the Web | R switch, and says
what it wants when it fails. Follow `docs/WRITING.md`, and use no em-dashes,
including in code comments.

## The shape

- A tutorial is one continuous line of work: sequences to alignment to tree to
  the layers an analysis produces, ending on a `#data=` link that opens the
  result. Each step consumes what the step before produced. One dataset is the
  default; a second only where the first raised the question it answers.
- Every dataset carries a built-in control, something in the same figure that
  ought to come out negative, and the page ends by checking the inference
  against the raw data.
- The analysis happens outside the viewer (`docs/layers.md`). The page shows the
  command that produces each file the viewer loads, in a form a reader runs on
  their own data; everything else lives in `scripts/build_<topic>.sh`, which
  `## Reproduce it end to end` curls from GitHub and runs. Every number in the
  prose is one a run of that script printed. A pipeline inside a language ships
  `build_<topic>.R` or `build_<topic>.py` instead, and the page's snippets are
  the same code the script runs.
- The opening is two to four sentences on what the page looks at and why, in the
  reader's terms, then a lead-in ending "we:" and three to five bullets, one per
  stage in page order, each opening on a verb the reader performs. The biology
  goes in the lead-in, never a finding in a bullet.
- Screenshots tell the story. Each step opens on its action in a sentence or
  two, then the fence or the figure; the caption describes the frame, and prose
  beside it adds only what the caption lacks. Biology gets one or two sentences
  per step: no literature tour, no mechanism history, no "why this matters"
  paragraph. Step headings are `## N. <what the reader does or gets>`, parallel
  across the page.
- Prerequisites lists one bullet per tool a fence on the page runs, with its
  install line, and nothing else.
- The data names the release and cites it in one sentence, then a table of
  **What it is** and **File**, the link text being the file name. A row standing
  for one request of many says so and shows the one URL.
- Reproduce it end to end says in three or four steps what the script does, in
  the reader's terms and without commands, then points at
  [Prerequisites](#prerequisites). A tutorial teaches the method; the script
  only saves typing.
- Repeated prose is load-bearing: the ClustalW bullet and "the label becomes the
  FASTA defline" recur because each page reads from a cold start. Keep their
  wording consistent.
- Stop a section at the observation. No thesis paragraph, no naming a wrong
  inference to refute it, no "the honest result". Gene symbols are `_italic_` in
  prose and bare in captions and headings.

## Web and R

The step that opens the finished result gives it two ways, behind the Web | R
switch: the `#data=` link, and the same view in R with
[ggmsaview](https://github.com/GMOD/ggmsaview). `rna_family.md` step 6 is the
model:

```md
<!-- usage: web -->

The snapshot fence, the figure link and its caption, as before.

<!-- usage: r -->

One sentence on what ggmsaview reads, then a fence that builds `w` with
`msaview()` and its layers over the hosted files, prints `w`, and `ggsave()`s
`msaview_plot(w)` to the figure below.

![](../media/<topic>-<step>-r.png)

Caption: what the ggplot2 figure shows.

<!-- /usage -->
```

- The R fence reads the files at `https://gmod.org/JBrowseMSA/demo/data/...`,
  the same ones the link loads, and a metadata TSV through `read.delim()` into
  `geom_msa_rowdata()`
- It carries the view's content, not its zoom or scroll: `col_width`, `scrollX`
  and `height` belong to the web half
- `Rscript scripts/tutorials-r.R <topic>` runs every R fence the way a reader
  pastes it, and copies each file it saves that its panel shows into
  `docs/media`; `pnpm media:push` uploads it
- A view the R API cannot express gets the nearest ggmsaview figure and a
  caption saying what it leaves out; the gap goes to GMOD/ggmsaview, not into
  the tutorial

## Figures

A figure is a linked image followed by its caption paragraph; `wrapFigures` in
`website/astro.config.mjs` turns the pair into a `<figure>`:

```md
[![](../media/<topic>-<step>.png)](https://gmod.org/JBrowseMSA/demo/#data=...)

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

Hosted files the links load go under `packages/app/public/data/<topic>/`, served
at `gmod.org/JBrowseMSA/demo/data/<topic>/`, with a row in that directory's
`README.md`. Keep them small; a large public file that already sends
`Access-Control-Allow-Origin` (the InterPro API, NCBI eutils, PDBe) is loaded
from its source instead of rehosted.

Registering a page is a file in `docs/tutorials` plus an entry in
`website/src/lib/tutorials.ts`, whose `thumb` is one of the page's own figures.

## Live pages

A page that mounts the viewer beside another live view is a hand-written
`website/src/pages/tutorials/<slug>.astro` with its React island in
`website/src/components/`, under a slug no markdown file uses.
`structure_link.astro` is the model: its island loads the hosted files from
`gmod.org/JBrowseMSA/demo/data/`, and it imports Mol\* with a dynamic
`import()`, so no other page downloads it. Its card figure comes from
`scripts/screenshots/structure-link-figure.mjs`, run against a dev server or
`astro preview`, which also prints every status line its pointer sweep produced:
the check that both bridges work.
