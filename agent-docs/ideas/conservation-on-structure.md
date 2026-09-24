# Conservation mapped onto 3D structure

Color a structure's residues by the conservation of the alignment column each
one falls in. The per-column number exists (the conservation track, and the
sequence logo's information content), so the work is the coordinate hop and a
Mol* color theme.

The hop has two routes, one per host:

- **In JBrowse**, protein3d reaches the alignment through the genome: a column's
  codon (`connectedHoverHighlights`), then the transcript, then the structure,
  the path its hover has taken since protein3d `137bb13`. Coloring every residue
  runs the same hop once per column. protein3d's `agent-docs/plan.md` notes the
  missing piece there, a custom Mol* `ColorTheme` provider.
- **On a standalone page** with both viewers and no genome, such as
  `/tutorials/structure_link`, `structureResidue` reads the hop straight from
  the `residueMappings` layer
  ([alignment-structure-mapping-layer](alignment-structure-mapping-layer.md)).

The standalone route is the cheaper first step: `structure_link.astro` already
holds the Mol* plugin and the model, so it needs the color theme and a toggle,
with no change to either plugin.
