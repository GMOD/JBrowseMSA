# Precomputed alignments for mouse, fly and worm

**Closed: the gene explorer that would have read them is gone.**

The website's gene explorer read a human gene's whole 100-way alignment with one
random read from a hosted bgzip. The idea extended that path to mouse (`mm39`),
fly (`dm6`) and worm (`ce11`): `scripts/gene-explorer/build-data.mjs` already
built the index for those assemblies, and the remaining work was hosting the
files and wiring `website/src/lib/geneExplorer.ts` to read them.

Commit f4ae402f removed the explorer, both of those files and the rest of
`scripts/gene-explorer/`, because jb2hubs' `/protein-browser` does the same job.
Gene-first features belong in jb2hubs, so a hosted multi-species alignment is
work for that repo. The full plan, with the per-species table and the `.cds`
sidecar that replaces NCBI's `gene_table`, is in this file's git history.
