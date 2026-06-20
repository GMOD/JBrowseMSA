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

## More real example datasets

- A structured-RNA example chosen for prominent base-pairing (tRNA set, or a
  riboswitch) to put the **secondary-structure track** front and center — the
  Lysine riboswitch has SS data but doesn't feature it. Add via
  `scripts/examples-gen` (Rfam Stockholm already carries SS + tree).

## Phylogeny quality

- The example trees are ClustalW neighbor-joining (fast, deterministic, fine for
  illustration). Document/support an optional upgrade path to MAFFT/MUSCLE +
  IQ-TREE/FastTree for publication-grade trees in `scripts/examples-gen`.

## More examples

More candidates remain if you want to keep going (lysozyme convergence, a
homeodomain/Hox set, an aquaporin channel family), but a dozen feels like a
strong, non-bloated set. Happy to add more or stop here.

## Done

- Added committed InterProScan domain overlays (Pfam+CDD, EBI API) to the
  multi-domain examples: myd88 (Death+TIR), prestin (SLC26+STAS), p53
  (TAD/DBD/tetramerization), ef1a (3-domain EF GTPase), ace2 (peptidase
  M2+collectrin). Wired into the gallery components via `gff=`.
- Added paper citations to the real-biology example components and the
  examples-gen README dataset table. MyD88 ↔ Tian et al. 2023, Sci. Adv.
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC10162675/).
