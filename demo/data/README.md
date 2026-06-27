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

The files below back the **Genome browser** docs page (JBrowse integration). They are
built by `scripts/f12-cetacean/` (see its README), not by `writeExampleData.mjs`:

| File                              | Format            | Provenance                                                                                          |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `f12-cetacean-cds.stock`          | Stockholm (+tree) | F12 coding alignment across mammals, stitched from UCSC cactus 241-way; tree inferred with ClustalW |
| `f12-cetacean-region.stock`       | Stockholm (+tree) | The above windowed on the shared cetacean frameshift (CDS col ~205)                                 |
| `multiz470way-mammals.nh`         | Newick            | Pruned UCSC `hg38.470way.nh` (the genome-browser MAF track's displayed species)                     |
| `jbrowse-msa-combined-config.json`| JBrowse config    | hg38 + NCBI RefSeq gene track + Multiz 470-way MAF track + the MsaView plugin                       |

The formats are detected from file content (the `CLUSTAL` / `# STOCKHOLM` / `>` /
`##gff` header), so the extensions above are only for readability.
