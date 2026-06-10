# react-msaview (JBrowseMSA)

An interactive multiple sequence alignment viewer, also known as JBrowseMSA. It
renders a phylogenetic tree alongside a protein or DNA alignment on HTML5
canvas, with protein domain annotations, many color schemes, and SVG export.
Usable from React, plain HTML (UMD bundle), and R.

![Protein alignment with tree](docs/media/example-protein.svg)

## Features

- Tree and alignment rendered together, tiled for large inputs
- Parses FASTA, Stockholm, Clustal, A3M, EMF alignments and Newick/EMF trees
- Protein domain overlays from InterProScan GFF (see the [CLI](packages/cli/))
- Protein and nucleotide color schemes, including per-column dynamic schemes
- React component, UMD-in-HTML, and R htmlwidget entry points

## Quick start (React)

```sh
npm install react-msaview @jbrowse/core @mui/material @emotion/react @emotion/styled react react-dom
```

```tsx
import { MSAViewer } from 'react-msaview'

export default function App() {
  // backticks (template literal) so the \n become real newlines
  return (
    <MSAViewer
      msa={`>human\nMKAANSE\n>mouse\nMKA-NSE`}
      tree="(human:0.1,mouse:0.2);"
      colorScheme="clustal"
    />
  )
}
```

No model creation, width management, or theme provider needed. For the
model-based API, UMD bundle, and full prop reference see [USAGE.md](USAGE.md).

## Quick start (R)

```r
library(msaviewr)
msaview(msa = "alignment.fasta", tree = "tree.nwk", color_scheme = "clustal")
```

![Hemoglobin alignment with tree](docs/media/r-quickstart.svg)

See the [R package README](packages/r-msaview/README.md) for ape, Biostrings,
ggtree, treeio, and Shiny usage.

## Protein domains

Domain annotations (e.g. the GFF emitted by the [CLI](packages/cli/)) overlay as
labelled boxes on the alignment:

![InterProScan domains](docs/media/example-domains.svg)

## Demo & docs

- Live examples: https://jbrowse.org/storybook/msa
- [User guide](docs/user_guide.md) · [Usage / API](USAGE.md) ·
  [R package](packages/r-msaview/README.md)
- [ProteinBrowser](https://github.com/GMOD/proteinbrowser) — a full suite of
  protein analysis tools built on this viewer

## Packages

| Package                                       | Description                                                |
| --------------------------------------------- | ---------------------------------------------------------- |
| [packages/lib](packages/lib/)                 | Main react-msaview React component                         |
| [packages/app](packages/app/)                 | Demo application (deployed at https://gmod.org/JBrowseMSA) |
| [packages/cli](packages/cli/)                 | Command-line tools                                         |
| [packages/msa-parsers](packages/msa-parsers/) | MSA file format parsers                                    |
| [packages/r-msaview](packages/r-msaview/)     | R htmlwidget (ggtree/Biostrings/treeio interop)            |
| [packages/svgcanvas](packages/svgcanvas/)     | SVG canvas rendering (ESM fork of svgcanvas)               |

## Development

```bash
git clone https://github.com/GMOD/react-msaview
cd react-msaview
pnpm install
```

### Run the demo app

```bash
pnpm dev
```

This starts the app with hot module reloading. When this is active, source code
changes to `packages/lib/src/` will automatically reloaded by the dev server
app.

### Build all packages

```bash
pnpm build
```

### Run tests

```bash
pnpm test
```

### Other commands

```bash
pnpm lint        # Run ESLint
pnpm format      # Format with Prettier
pnpm typecheck   # Typecheck all packages
pnpm clean       # Clean all dist folders
```

## Publishing a new release

To cut a new release run

`scripts/release.js`

This makes a new git tag and pushes to github.

We use npm trusted publishing so just having a new tag published to github
launches the npm release process

## Notes

This repo also supports https://github.com/GMOD/jbrowse-plugin-msaview which is
a JBrowse 2 plugin for viewing MSAs.

This repo also builds on abrowse (https://github.com/ihh/abrowse) and
phylo-react (https://www.npmjs.com/package/phylo-react).
