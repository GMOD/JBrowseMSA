# react-msaview (JBrowseMSA)

A multiple sequence alignment viewer, also known as JBrowseMSA.

![MSA Viewer screenshot](docs/media/image1.png)

## Quick start

```tsx
import { MSAViewer } from 'react-msaview'
;<MSAViewer
  msa=">human\nMKAA\n>mouse\nMKAG"
  tree="(human:0.1,mouse:0.2);"
  colorScheme="clustal"
/>
```

No model creation, no width management, no theme provider needed.

For R users:

```r
library(msaviewr)
msaview(msa = "alignment.stock", color_scheme = "clustal")
```

## Docs

- [User guide](docs/user_guide.md)
- [Usage / API](USAGE.md) - React component, UMD bundle, and R package
- [R package README](packages/r-msaview/README.md) - ggtree, Biostrings, Shiny

## Demo

See [ProteinBrowser](https://github.com/GMOD/proteinbrowser) for a full suite of
protein analysis tools.

## Packages

| Package                                       | Description                                                |
| --------------------------------------------- | ---------------------------------------------------------- |
| [packages/lib](packages/lib/)                 | Main react-msaview React component                         |
| [packages/app](packages/app/)                 | Demo application (deployed at https://gmod.org/JBrowseMSA) |
| [packages/cli](packages/cli/)                 | Command-line tools                                         |
| [packages/msa-parsers](packages/msa-parsers/) | MSA file format parsers                                    |
| [packages/r-msaview](packages/r-msaview/)     | R htmlwidget (ggtree/Biostrings/treeio interop)            |
| [packages/svgcanvas](packages/svgcanvas/)     | SVG canvas rendering (ESM fork of svgcanvas)               |
| [packages/r-msaview](packages/r-msaview/)     | R htmlwidget (ape, ggtree, Biostrings, Shiny)              |

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

This starts the app with hot module reloading. Changes to `packages/lib/src/`
will automatically reload.

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

## Notes

This repo also supports https://github.com/GMOD/jbrowse-plugin-msaview which is
a JBrowse 2 plugin for viewing MSAs.

This repo also builds on abrowse (https://github.com/ihh/abrowse) and
phylo-react (https://www.npmjs.com/package/phylo-react).
