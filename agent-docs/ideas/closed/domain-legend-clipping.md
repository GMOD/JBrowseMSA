# The annotation legend is NOT clipped

**Closed: measured, not a bug.** This file exists so nobody re-opens it.

A long-running claim downstream in JBrowse held that `DomainLegend.tsx` gets cut
off by the view's fixed height once an alignment carries more distinct CDD
domains than fit, and that the fix was to scroll it or cap it. Measured on a
real page — a twelve-row NLRP1 ortholog alignment, 18 legend entries, MsaView
under an LGV in an 878px viewport — it is none of those things:

- `maxHeight: '60%'` resolves. The Paper is 330px, which is 60% of the 550px
  `MSAPanel` wrapper. A percentage max-height does resolve against a positioned
  ancestor even when that ancestor's own height is content-derived, because the
  Paper is absolutely positioned.
- Nothing clips it. Paper bottom 813, nearest `overflow: hidden` ancestor bottom
  855, and zero legend rows fall past that edge.
- The inner `overflow: 'auto'` div really does scroll: `clientHeight` 296
  against `scrollHeight` 313.

The component behaves as designed. What it looks like is a scrollable list whose
last row is half-visible, and in a **screenshot** that is indistinguishable from
truncation — which is where the claim came from. Raising the embedding frame
does not help, correctly: the legend is sized off the view, not the page.

If the last entries should be readable without scrolling, that is a design
change — a taller cap, a wider two-column key, or drawing the key outside the
alignment area — and it should be argued on its own merits, not filed as a bug.
