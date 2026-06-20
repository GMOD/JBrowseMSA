# Hosted example data

These files are served at `gmod.org/JBrowseMSA/demo/data/*` (and at the app
root in local dev). They let a `?data=` deep-link point a `msaFilehandle` /
`treeFilehandle` / `gffFilehandle` at a hosted file instead of inlining the
whole alignment in the URL — the user-guide figures link to live views this
way, keeping those links small (the lysine Stockholm alone is ~26 KB inline).

They are **generated**, not hand-maintained — each is written verbatim from a
constant in `packages/examples/src/examples/exampleData.ts`, which carries the
authoritative provenance comment for every dataset. Regenerate after changing a
source constant:

```sh
node scripts/screenshots/writeExampleData.mjs
```

(`pnpm screenshots` runs this automatically before building the app.)

| File                 | Source constant    | Format              | Provenance                                                                                                 |
| -------------------- | ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `kinase.aln`         | `kinaseMSA`        | CLUSTAL             | Src-family kinases (SRC/YES/FYN/FGR/HCK/LYN/LCK/BLK, human + SRC mouse/chick), full-length UniProt sequences aligned with Clustal Omega |
| `kinase.nh`          | `kinaseTree`       | Newick              | Clustal Omega guide tree for the alignment above                                                           |
| `kinase-domains.gff` | `kinaseDomainsGFF` | InterProScan GFF3   | `react-msaview-cli interproscan kinase.aln` against the EBI InterProScan API (PfamA, CDD)                  |
| `lysine.stock`       | `lysineMSA`        | Stockholm (tree+SS) | Rfam Lysine riboswitch [RF00168](https://rfam.org/family/RF00168) seed alignment — 60 bacterial sequences, tree (`#=GF NH`) and SS embedded |

The formats are detected from file content (the `CLUSTAL` / `# STOCKHOLM` / `>` /
`##gff` header), so the extensions above are only for readability.
