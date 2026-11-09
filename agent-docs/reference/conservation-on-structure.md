# Conservation mapped onto 3D structure

**The standalone page shipped 2026-09-25. The JBrowse route belongs to
protein3d.**

Color a structure's residues by the conservation of the alignment column each
one falls in. The per-column number already exists as `model.conservation`,
which the conservation track draws, so the work is the coordinate hop and the
Mol\* coloring.

The hop has two routes, one per host:

- **On a standalone page** with both viewers and no genome,
  `/tutorials/structure_link` has a checkbox that paints each mapped chain.
  `StructureLinkedViewer.tsx` walks every polymer residue through `rowResidue`
  (the `residueMappings` layer, see
  [alignment-structure-mapping-layer](alignment-structure-mapping-layer.md)) and
  `seqPosToVisibleCol` to a column, bins `model.conservation` there into five
  blue steps, and hands each bin to Mol\*'s `setStructureOverpaint`. A residue
  with no column is grey. A MobX reaction repaints when the rows on screen
  change, so collapsing a clade recolors the structure.
- **In JBrowse**, protein3d reaches the alignment through the genome: a column's
  codon (`connectedHoverHighlights`), then the transcript, then the structure,
  the path its hover has taken since protein3d `137bb13`. Coloring every residue
  runs the same hop once per column. protein3d's `agent-docs/plan.md` notes the
  missing piece there, a custom Mol\* `ColorTheme` provider. Overpaint, as the
  standalone page uses it, is the cheaper alternative to a theme provider: one
  call per bin, with no registration.

## Any column track, on cartoon or surface

`StructurePanel` and `FacetGrid` paint from `colorBy`, which is `conservation`,
`scheme` or `track:<id>`. `residueColor` in `packages/structure/src/paint.ts`
colors a residue from a track:

- a bar track's values, scaled by its `domainMax`, through the five-step ramp
- a text track's letters, through its color scale, matched in upper case as the
  track draws them

`columnTrackContent` fills a column where a track's `row` has a gap with 0 or a
space, so `residueColor` checks that row in the alignment and gives those
residues `noColumnColor`, including when the row sits in a collapsed clade.

`representation: 'surface'` draws the polymer as a Mol\* molecular surface
through `drawPolymerAs`, with ligands as ball and stick. Unset,
`chains="mapped"` draws as cartoon and `chains="all"` as Mol\*'s preset picks
for the structure's size, a Gaussian surface past 30,000 residues. The preset's
atomic-detail drawing, for a structure under 10 residues or a gappy one, has no
polymer component, so `representation` leaves it as it is.
