# InterPro annotation box stacking overflows the row

`renderBoxFeatureCanvasBlock.ts` draws stacked sub-feature boxes at a hardcoded
4px each (`h = subFeatureRows ? 4 : rowHeight`). A sequence carrying more than
`rowHeight / 4` InterPro entries therefore overflows past the row bottom and
into its neighbor.

Dividing by `entry.length` would fit them, but on a busy sequence the boxes
would become too thin to see. The fix needs a minimum height plus a decision
between clamping and scrolling, so the item stays open until someone makes that
design call.
