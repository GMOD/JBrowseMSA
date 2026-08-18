# react-msaview (JBrowseMSA)

An interactive multiple sequence alignment viewer.

![Protein alignment with tree](docs/media/example-protein.svg)

## Features

- Tree and alignment rendered together, tiled to stay fast on large inputs
- Parses FASTA, Stockholm, Clustal, A3M, and EMF alignments and Newick/EMF trees
- Protein domain overlays from InterProScan GFF (generate them with the
  [CLI](packages/cli/))
- Protein and nucleotide color schemes, including per-column dynamic schemes
- Conservation, property-conservation and sequence-logo tracks over the columns
- React component, UMD-in-HTML, and R htmlwidget entry points
- Shareable view state and SVG export

## Documentation

Jump to what you need:

| You want to…                                             | Start here                                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Use the viewer** — load data, explore, export an image | [User guide](docs/user_guide.md) · [live app](https://gmod.org/JBrowseMSA/demo/) · [docs site](https://gmod.org/JBrowseMSA)                            |
| **Embed the React component** in your own app            | [Usage & embedding guide](USAGE.md) · [live code examples](https://jbrowse.org/storybook/msa) · [model API reference](packages/lib/apidocs/MsaView.md) |
| **Use it from R** (ape, Biostrings, ggtree, Shiny)       | [R package README](packages/r-msaview/README.md)                                                                                                       |
| **Annotate protein domains** from an alignment           | [CLI README](packages/cli/) — batch InterProScan → GFF                                                                                                 |
| **Contribute / hack on the code**                        | [Development](#development)                                                                                                                            |

## Quick start (React)

```sh
pnpm add react-msaview @jbrowse/core @mui/material @emotion/react @emotion/styled react react-dom
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
model-based API, UMD bundle, and full prop reference see [USAGE.md](USAGE.md),
and browse runnable snippets in the
[live examples](https://jbrowse.org/storybook/msa).

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

## Packages

| Package                                       | Description                                                |
| --------------------------------------------- | ---------------------------------------------------------- |
| [packages/lib](packages/lib/)                 | Main react-msaview React component                         |
| [website](website/)                           | Docs site (deployed at gmod.org/JBrowseMSA)                |
| [packages/app](packages/app/)                 | Demo application (deployed at gmod.org/JBrowseMSA/demo)    |
| [packages/examples](packages/examples/)       | Live usage examples (deployed at the Storybook link above) |
| [packages/cli](packages/cli/)                 | Command-line tools (batch InterProScan)                    |
| [packages/msa-parsers](packages/msa-parsers/) | MSA file format parsers                                    |
| [packages/r-msaview](packages/r-msaview/)     | R htmlwidget (ape/ggtree/Biostrings/treeio interop)        |
| [packages/svgcanvas](packages/svgcanvas/)     | SVG canvas rendering (ESM fork of svgcanvas)               |

## Development

```bash
git clone https://github.com/GMOD/react-msaview
cd react-msaview
pnpm install
```

| Command                              | What it does                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `pnpm dev`                           | Run the demo app with hot reload (edits in `packages/lib/src/`)                     |
| `pnpm --filter examples dev`         | Run the live examples gallery                                                       |
| `pnpm build`                         | Build all packages                                                                  |
| `pnpm test`                          | Run the test suite                                                                  |
| `pnpm figures`                       | Regenerate the README figures (headless SVG, `packages/lib/scripts`)                |
| `pnpm screenshots`                   | Regenerate the user-guide app screenshots (diff-gated; only changed images rewrite) |
| `pnpm lint` / `format` / `typecheck` | Lint (oxlint), format (oxfmt, plus Prettier for `.astro`), typecheck all packages   |

The workspace is **pnpm-only** — `pnpm-lock.yaml` at the root is the single
lockfile, and a `preinstall` guard
([scripts/only-pnpm.mjs](scripts/only-pnpm.mjs)) stops an accidental
`npm install`/`yarn` from producing a second, unvetted dependency tree. Get pnpm
with `corepack enable`.

You'll also notice `@jbrowse/core` and `@jbrowse/render-core` resolved from
tarballs in `vendor-jbrowse/` via `overrides` in
[pnpm-workspace.yaml](pnpm-workspace.yaml). This is a **temporary stopgap**: the
workspace is on MUI v9 and there is no MUI-v9-compatible `@jbrowse/core` on npm
yet. The tarballs are built from a local jbrowse-components checkout with
[scripts/pack-local-jbrowse.mjs](scripts/pack-local-jbrowse.mjs) and are checked
in so `main` stays installable. Both the override block and the tarballs go away
once a compatible version is published.

Architecture notes live in [CLAUDE.md](CLAUDE.md); the core state model is
`packages/lib/src/model.ts` (MobX-state-tree), and `observer`-wrapped components
re-render when observed model properties change.

## Deployment

- **Docs site → gmod.org/JBrowseMSA**, with the **demo app at
  gmod.org/JBrowseMSA/demo**. `pnpm build:pages` builds both into `pages-dist/`
  (docs at the root, app under `/demo`); the
  [Deploy docs site](.github/workflows/deploy-docs.yml) workflow publishes it to
  the `gh-pages` branch on every push to `main`. To deploy by hand:
  `pnpm deploy:pages`.
- **Examples gallery → jbrowse.org/storybook/msa** is deployed separately and
  **must be run locally** (it needs AWS credentials). Build it with
  `pnpm --filter examples build`, then upload `packages/examples/dist/` by hand
  — there is no `deploy:` script for this one yet.

## Releasing

Run `scripts/release.js` to create and push a new git tag. We use npm trusted
publishing, so pushing a tag to GitHub launches the npm release automatically.

## Related projects

- [jbrowse-plugin-msaview](https://github.com/GMOD/jbrowse-plugin-msaview) — a
  JBrowse 2 plugin for viewing MSAs, supported by this repo
- [ProteinBrowser](https://github.com/GMOD/proteinbrowser) — a full suite of
  protein analysis tools built on this viewer

Builds on [abrowse](https://github.com/ihh/abrowse) and
[phylo-react](https://www.npmjs.com/package/phylo-react).
