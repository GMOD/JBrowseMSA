# Color rows by group (publication-style figures)

The viewer colors residues by scheme — per-letter, or per-column statistics —
but nothing shades a **row** by a group label. Comparative-genomics figures lean
on exactly that: the yellow/blue/grey clade bands behind the MyD88 alignment in
PMC10162675 are row backgrounds, not residue colors. `relativeTo` already
reproduces the identity-dots half of that figure style; row-group color would
reproduce the clade-background half and make one-to-one paper figures possible.

Sketch: let a row carry a group or category — derived from a tree clade, read
from a metadata column, or supplied as an explicit map — and tint that row's
background across both the tree label and the alignment row, with a small
legend. The color infrastructure in `packages/lib/src/colorSchemes.ts` and
`useColorContrast.ts` already handles palettes and contrast, so this reuses it
rather than growing a second one.
