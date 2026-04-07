# react-msaview (JBrowseMSA)

A multiple sequence alignment viewer, also known as JBrowseMSA.

## Docs

See [user guide](docs/user_guide.md)

## Demo

See [ProteinBrowser](https://github.com/GMOD/proteinbrowser) for a full suite of
protein analysis tools.

## Packages

| Package                                       | Description                                                |
| --------------------------------------------- | ---------------------------------------------------------- |
| [packages/lib](packages/lib/)                 | Main react-msaview React component                         |
| [packages/app](packages/app/)                 | Demo application (deployed at https://gmod.org/JBrowseMSA) |
| [packages/cli](packages/cli/)                 | Command-line tools (InterProScan batch processing)         |
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

## Programmatic usage, embedding, downloading from NPM

To install as a NPM package or CDN style bundle, see [USAGE.md](USAGE.md)

## Notes

This repo also supports https://github.com/GMOD/jbrowse-plugin-msaview which is
a JBrowse 2 plugin for viewing MSAs.

This repo also builds on abrowse (https://github.com/ihh/abrowse) and
phylo-react (https://www.npmjs.com/package/phylo-react).
