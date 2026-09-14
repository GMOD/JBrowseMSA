# react-msaview

A React component for viewing multiple sequence alignments: a phylogenetic tree
rendered alongside a protein or DNA alignment, with protein domain annotations,
many color schemes, and SVG export.

![Protein alignment with tree](../../docs/media/example-protein.svg)

## Install

The viewer shares mobx, mobx-state-tree and MUI with `@jbrowse/core` and needs
one copy of each, so the install line pins those majors to what your
`@jbrowse/core` depends on. The
[usage & embedding guide](../../USAGE.md#zero-config-component-recommended) has
the install line.

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
For full control, use the `MSAModelF` / `MSAView` model-based API described in
the [usage & embedding guide](../../USAGE.md).

## Docs & links

- [Usage & embedding guide](../../USAGE.md): props, model API, UMD bundle, R
- [Live examples](https://gmod.org/JBrowseMSA/examples): runnable snippets
- [Model API reference](apidocs/MsaView.md)
- [Main repository](https://github.com/GMOD/JBrowseMSA)
- [CLI](../cli/): domain and exon GFFs, plus headless SVG export
- [msa-parsers](../msa-parsers/): standalone parsing library
- [ProteinBrowser](https://github.com/GMOD/proteinbrowser): protein analysis
  suite built on this viewer
