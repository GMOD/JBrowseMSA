# Consolidate the four protein-link generators

`scripts/{src,braf,tp53,tp53-protein3d}-protein-link/generate.mjs` are 738 LOC
doing one thing four times: tabix the same public RefSeq GFF, build
`connectedFeature`, assemble a JBrowse session spec, print the URL. Their own
headers say so ("Like the SRC/BRAF scripts…").

```
110  src-protein-link
180  braf-protein-link
181  tp53-protein-link
267  tp53-protein3d-link
```

One generator plus four config objects — transcript, region, query row,
highlight — is roughly 200 LOC.

`scripts/screenshots/` has the same shape: five entry points (`generate`,
`generate-screenshots`, `jbrowse-figures`, `f12-combined-figure`,
`f12-genome-figure`) over a shared `lib.mjs`.
