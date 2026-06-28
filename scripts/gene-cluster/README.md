# Gene arrow map demo (gggenes-style)

Builds the **gene-arrow-map** gallery example: a colinear gene cluster across
six genomes, with each gene drawn as a strand-directed arrow over a real
alignment. It demonstrates react-msaview's gene-arrow rendering — the same
overlay machinery that draws InterProScan domains and the F12 exon structure,
but with gene-level GFF features that carry a `+`/`-` strand.

This is **synthetic, illustrative data**, in the same spirit as the
[gggenes](https://github.com/wilkox/gggenes) R package's own bundled
`example_genes` dataset (which is likewise synthetic — "for example purposes
only"). It exists to exercise the rendering, not to assert any biology. A real
colinear locus (e.g. the β-globin cluster, or a bacterial operon stitched from a
genome alignment the way `scripts/f12-cetacean` stitches F12) is the natural next
step.

## What it shows

- **Consistent color per gene down the columns** (`Name=<gene>`, like F12 exons).
- **Strand as direction**: `+` genes point right, `-` genes (genC, genE) point
  left. Only gene-level GFF types get an arrowhead; exon/CDS/domain features stay
  rectangular blocks.
- **Inversions**: genC is inverted in `Genome_4` and genE in `Genome_6` — the
  arrow flips.
- **Deletion + alignment anchoring**: genB is deleted in `Genome_5` (its columns
  gap out and the gene drops from the overlay), yet the *downstream* genes stay
  column-aligned. That is the whole point of anchoring arrows to a real
  alignment rather than to each genome's own coordinate the way gggenes facets
  do: vertical homology is exact, not a cosmetic shift.

## Build

Deterministic (seeded PRNG), so re-running reproduces byte-identical output:

```sh
node scripts/gene-cluster/generate.mjs
```

Writes `gene-cluster.stock` (Stockholm alignment + embedded NJ-style tree) and
`gene-cluster.gff` (one gene-level, stranded feature per gene per genome). Those
two files are inlined as the `geneClusterMSA` / `geneClusterGFF` constants in
`packages/examples/src/examples/exampleData.ts`, which back the
`GeneCluster.tsx` gallery example.
