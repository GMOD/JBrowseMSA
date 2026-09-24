# Consolidate the four protein-link generators

`scripts/{src,braf,tp53}-protein-link/generate.mjs` and
`scripts/tp53-protein3d-link/generate.mjs` are 658 LOC doing one thing four
times: tabix the same public RefSeq GFF, build `connectedFeature`, assemble a
JBrowse session spec, print the URL. Their own headers note the duplication
("Like the SRC/BRAF scripts…").

```
109  src-protein-link
156  braf-protein-link
151  tp53-protein-link
242  tp53-protein3d-link
```

One generator plus four config objects (transcript, region, query row,
highlight) would be roughly 200 LOC.
