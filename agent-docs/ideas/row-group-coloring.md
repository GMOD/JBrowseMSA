# Color rows by group (publication-style figures)

The viewer colors residues by scheme, either per letter or by per-column
statistics, but it cannot shade a **row** by a group label. Comparative-genomics
figures rely on row shading: the yellow/blue/grey clade bands behind the MyD88
alignment in PMC10162675 are row backgrounds, not residue colors. `relativeTo`
already reproduces the identity dots in that figure style; row-group color would
reproduce the clade backgrounds, so a paper's figure could be matched exactly.

Sketch: let a row carry a group or category, derived from a tree clade, read
from a metadata column, or supplied as an explicit map. Tint that row's
background across both the tree label and the alignment row, with a small
legend. The color code in `packages/lib/src/colorSchemes.ts` and
`useColorContrast.ts` already handles palettes and contrast, so row tinting
should reuse it.
