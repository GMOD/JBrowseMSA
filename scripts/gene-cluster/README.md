# Gene arrow map demo (gggenes-style)

Builds the **gene-arrow-map** example: a colinear gene cluster across six
genomes, with each gene drawn as a strand-directed arrow over an alignment. The
arrows use the overlay that draws InterPro domains and the F12 exon structure,
with gene-level GFF features that carry a `+`/`-` strand.

The data is **synthetic**, like the [gggenes](https://github.com/wilkox/gggenes)
R package's bundled `example_genes` dataset ("for example purposes only"), and
makes no biological claim. A real colinear locus, such as the β-globin cluster
or a bacterial operon stitched from a genome alignment the way
`scripts/f12-cetacean` stitches F12, would replace it.

## What it shows

- **Consistent color per gene down the columns** (`Name=<gene>`, like F12
  exons).
- **Strand as direction**: `+` genes point right, `-` genes (genC, genE) point
  left. Only gene-level GFF types get an arrowhead; exon/CDS/domain features
  stay rectangular blocks.
- **Inversions**: genC is inverted in `Genome_4` and genE in `Genome_6`, and the
  arrow flips.
- **Deletion + alignment anchoring**: genB is deleted in `Genome_5` (its columns
  are gaps and the gene drops from the overlay), and the downstream genes stay
  in their columns. The arrows are anchored to the alignment, so homologous
  genes share columns, which gggenes facets on per-genome coordinates don't
  give.

## Build

Deterministic (seeded PRNG), so re-running reproduces byte-identical output:

```sh
node scripts/gene-cluster/generate.mjs
```

Writes `gene-cluster.stock` (Stockholm alignment + embedded NJ-style tree) and
`gene-cluster.gff` (one gene-level, stranded feature per gene per genome), which
go in `packages/examples/data/` and back the `GeneCluster.tsx` example.
