# TODO / backlog

Ideas captured for later, not yet required.

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

## cap size of 'conservation track' track label

when zoom in gets too large. should be max size of other text labels

## Code review backlog (noted, deferred)

From a repo-wide review pass. These are real but lower-priority or judgment
calls left unfixed.

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

### TreeCanvasBlock hover redraw via state+effect

`TreeCanvasBlock.tsx` keeps `hoverElt` in React state purely to drive an
imperative mouseover-canvas redraw in a `useEffect`; the value never reaches
JSX. Could draw directly in the `onMouseMove` handler and drop both the state
and the effect (event-driven, not display-driven).

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
