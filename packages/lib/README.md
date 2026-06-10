# react-msaview

A React component for viewing multiple sequence alignments: a phylogenetic tree
rendered alongside a protein or DNA alignment, with protein domain annotations,
many color schemes, and SVG export.

![Protein alignment with tree](../../docs/media/example-protein.svg)

## Install

```sh
npm install react-msaview @jbrowse/core @mui/material @emotion/react @emotion/styled react react-dom
```

## Quick start

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

`MSAViewer` creates the model, measures width, and applies the theme for you.
For full control use the `MSAModelF` / `MSAView` model-based API — see the
[usage & embedding guide](../../USAGE.md).

## Docs & links

- [Usage & embedding guide](../../USAGE.md) — props, model API, UMD bundle, R
- [Live examples](https://jbrowse.org/storybook/msa) — runnable snippets
- [Model API reference](apidocs/MsaView.md)
- [Main repository](https://github.com/GMOD/JBrowseMSA)
- [CLI](../cli/) — batch InterProScan → GFF domain annotations
- [msa-parsers](../msa-parsers/) — standalone parsing library
- [ProteinBrowser](https://github.com/GMOD/proteinbrowser) — full protein
  analysis suite built on this viewer
