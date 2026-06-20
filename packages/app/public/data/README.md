# Hosted example data

These files are served at `gmod.org/JBrowseMSA/demo/data/*` (and at the app
root in local dev). They let a `?data=` deep-link point a `msaFilehandle` /
`treeFilehandle` / `gffFilehandle` at a hosted file instead of inlining the
whole alignment in the URL — the user-guide figures link to live views this
way, keeping those links small (the lysine Stockholm alone is ~26 KB inline).

They are **generated**, not hand-maintained — each mirrors a constant in
`packages/examples/src/examples/exampleData.ts`:

| File                 | Source constant      | Format             |
| -------------------- | -------------------- | ------------------ |
| `kinase.aln`         | `kinaseMSA`          | CLUSTAL            |
| `kinase.nh`          | `kinaseTree`         | Newick             |
| `kinase-domains.gff` | `kinaseDomainsGFF`   | InterProScan GFF3  |
| `lysine.stock`       | `lysineMSA`          | Stockholm (tree+SS) |

Regenerate after changing the source constants:

```sh
node scripts/screenshots/writeExampleData.mjs
```

(`pnpm screenshots` runs this automatically before building the app.)
