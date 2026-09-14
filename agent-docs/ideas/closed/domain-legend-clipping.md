# Annotation legend clipping

**Closed: measured, not a bug.** The measurements are recorded here so the item
is not filed again.

A long-running claim downstream in JBrowse held that the view's fixed height cuts
off `DomainLegend.tsx` once an alignment carries more distinct CDD domains than
fit, and that the fix was to scroll it or cap it. We measured it on a real page:
a twelve-row NLRP1 ortholog alignment, 18 legend entries, MsaView under an LGV
in an 878px viewport.

- `maxHeight: '60%'` resolves. The Paper is 330px, which is 60% of the 550px
  `MSAPanel` wrapper. A percentage max-height resolves against a positioned
  ancestor even when that ancestor's own height is content-derived, because the
  Paper is absolutely positioned.
- No ancestor clips the legend. The Paper's bottom is at 813, the nearest
  `overflow: hidden` ancestor's bottom is at 855, and zero legend rows fall past
  that edge.
- The inner `overflow: 'auto'` div scrolls: `clientHeight` 296 against
  `scrollHeight` 313.

The component behaves as designed. It renders a scrollable list whose last row
is half-visible, and in a **screenshot** that looks the same as truncation,
which is where the claim came from. Raising the embedding frame does not change
it, as intended, because the legend is sized off the view, not the page.

Making the last entries readable without scrolling would be a design change,
such as a taller cap, a wider two-column key, or drawing the key outside the
alignment area. Argue that on its own merits rather than filing it as a bug.
