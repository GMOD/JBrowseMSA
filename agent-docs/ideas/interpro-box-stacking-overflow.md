# InterPro annotation box stacking overflows the row

`renderBoxFeatureCanvasBlock.ts` draws stacked sub-feature boxes at a hardcoded
4px each (`h = subFeatureRows ? 4 : rowHeight`). A sequence carrying more than
`rowHeight / 4` InterPro entries therefore overflows past the row bottom and
into its neighbor.

Dividing by `entry.length` would fit them, but that makes boxes invisibly thin
on a busy sequence. The fix wants a minimum height plus a clamp or scroll
decision — a design call, not a one-liner, which is why this is still open.
