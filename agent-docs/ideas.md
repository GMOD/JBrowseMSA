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
- The inner `overflow: 'auto'` div really does scroll: `clientHeight` 296 against
  `scrollHeight` 313.

So the component behaves as designed. What it looks like is a scrollable list
whose last row is half-visible, and in a **screenshot** that is indistinguishable
from truncation, which is where the claim came from. Raising the embedding
frame does not help, correctly: the legend is sized off the view, not the page.

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
