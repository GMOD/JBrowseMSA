## Project overview

react-msaview (JBrowseMSA) is an interactive multiple sequence alignment viewer. It renders phylogenetic trees alongside protein/DNA alignments using HTML5 canvas with a tiled rendering system for scalability.

## Key packages

- `packages/lib` — main React component library (the core viewer)
- `packages/app` — demo app deployed at gmod.org/JBrowseMSA
- `packages/cli` — CLI for batch InterProScan queries against EBI API
- `packages/msa-parsers` — parsers for Stockholm, FASTA, Clustal, Newick, EMF, A3M, GFF
- `packages/svgcanvas` — vendored ESM fork of svgcanvas for SVG export
- `packages/r-msaview` — R htmlwidget package with ggtree/Biostrings/treeio interop

## Architecture decisions

- `packages/lib/src/model.ts` is a large MST model (~2000 lines). Do not attempt to modularize or split it into smaller files. Inline changes within the file are fine.
- The viewer uses MobX-state-tree for state management. Components use `observer` from mobx-react to reactively re-render.
- Canvas rendering uses a tiled block system (`calculateBlocks.ts`) to avoid rendering entire large alignments at once.
- InterProScan domain visualization is a core feature — do not remove it.
- The `hierarchy.ts` file is a custom d3-hierarchy replacement (no d3 dependency).

## Key entry points

- `packages/lib/src/model.ts` — the main MsaView state model (properties, actions, getters, autoruns)
- `packages/lib/src/components/MSAViewer.tsx` — zero-config declarative wrapper
- `packages/lib/src/components/Loading.tsx` — exported as MSAView, handles loading/import states
- `packages/lib/src/components/msa/renderMSABlock.ts` — core MSA canvas rendering
- `packages/lib/src/components/tree/renderTreeCanvas.ts` — tree canvas rendering
- `packages/lib/src/index.ts` — public API exports (MSAView, MSAViewer, MSAModelF)
