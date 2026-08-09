# Ideas / backlog

Captured for later, not yet required.

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

### The domain legend is capped against the content box, not the visible one

`DomainLegend.tsx` already carries `maxHeight: '60%'` and `overflow: 'auto'`, so
the obvious reading (it needs scrolling) is wrong and should not be acted on.
Measured in a real page instead, with `getComputedStyle` over the box tree:

- the Paper's positioned containing block is `MSAPanel`'s
  `position: relative` wrapper, whose height is the **alignment content**
  height (686px in the probe)
- that wrapper sits inside an `overflow: hidden` box which is the **visible**
  area (550px, `scrollHeight` 724)

So `60%` is 60% of 686, not of 550. The cap grows with the alignment while the
space to draw in does not, and past the crossover the legend runs off the bottom
and is cut by the hidden ancestor without its own `overflow: auto` ever
engaging, since it never reached its max-height. More rows makes it worse, and
more rows is also what puts more distinct domain types in the legend, so the two
move together. The model already has the right number: `msaAreaHeight` is the
visible height (`height - headerHeight - minimapHeight`), and
`showVerticalScrollbar` is `msaAreaHeight < totalHeight`, i.e. exactly this
distinction, drawn correctly elsewhere.

There is a second defect in the same place, and it is why this is a design
decision rather than swapping one number. Being positioned inside the content
wrapper pins the legend to the content, so it scrolls away when the alignment is
scrolled vertically. A key that leaves the screen is arguably wrong for an
overlay whose whole job is to stay readable, so the fix is probably to position
it against the visible box and cap it there, which is one change, not two.

Seen from JBrowse: a twelve-row NLRP1 ortholog alignment carries more distinct
CDD domains than the fixed view height can show, and the last entries are cut
off. Raising the embedding frame does nothing, because it is this element
clipping and not the frame (measured: +130px of frame gave 128px of blank page
and the same clipping).

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

### Duplicated FASTA defline parsing

The `>`-splitting + id/defline extraction loop is copy-pasted across
`FastaMSA.ts` (constructor) and `A3mMSA.ts` (constructor + `sniff`), and has
already diverged slightly (`FastaMSA` builds `colonNormalized`, A3m doesn't).
Extract a shared `parseFastaEntries(text)` helper in `msa-parsers` util to stop
the drift.

### parseNewick return type uses `any`

`parseNewick.ts` builds `let tree = {} as Record<string, any>` and has no
declared return type, so `StockholmMSA.getTree` feeds an untyped object into
`generateNodeIds`. The accumulator is naturally a partial `Node` (`children?`,
`name?`, `length?`) — type it and annotate the return.
