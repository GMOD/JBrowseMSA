# Usage

## Zero-config component (recommended)

The simplest way to use react-msaview in a React app. Handles model creation,
width measurement, and theming automatically.

```sh
npm install react-msaview @jbrowse/core @mui/material react react-dom @emotion/styled @emotion/react
```

```tsx
import { MSAViewer } from 'react-msaview'

export default function App() {
  // backticks (template literal) so the \n become real newlines; a plain
  // "..." JSX attribute would pass the literal characters \ and n instead
  return (
    <MSAViewer
      msa={`>human\nMKAANSE\n>mouse\nMKA-NSE`}
      tree="(human:0.1,mouse:0.2);"
      colorScheme="clustal"
    />
  )
}
```

Props:

| Prop             | Type           | Description                                   |
| ---------------- | -------------- | --------------------------------------------- |
| `msa`            | `string`       | Alignment text (FASTA, Stockholm, or Clustal) |
| `tree`           | `string`       | Newick tree text                              |
| `gff`            | `string`       | InterProScan domain annotations (GFF3 text)   |
| `msaFilehandle`  | `FileLocation` | Remote file location for alignment            |
| `treeFilehandle` | `FileLocation` | Remote file location for tree                 |
| `gffFilehandle`  | `FileLocation` | Remote file location for domain GFF           |
| `colorScheme`    | `string`       | Color scheme name (see below)                 |
| `height`         | `number`       | Widget height in pixels                       |

## Advanced: model-based API

For full control over the viewer state, use `MSAModelF` directly.

```tsx
import { MSAView, MSAModelF } from 'react-msaview'

export default function App() {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: {
      msa: 'string containing stockholm, clustalw, or multi-fasta msa here',
      tree: 'string containing newick formatted tree here',
    },
  })

  model.setWidth(1800)

  return (
    <div style={{ border: '1px solid black', margin: 20 }}>
      <MSAView model={model} />
    </div>
  )
}
```

The model exposes actions for programmatic control:

```ts
model.setColorSchemeName('clustal')
model.setRowHeight(20)
model.setColWidth(16)
model.toggleCollapsed('node-id')
model.fit() // fit both axes
```

## Using react-msaview in a plain HTML file with UMD bundle

```html
<html>
  <head>
    <script
      crossorigin
      src="https://unpkg.com/react-msaview/bundle/index.js"
    ></script>
  </head>
  <body>
    <div id="root" />
    <script>
      const { React, createRoot, MSAView, MSAModelF } = window.ReactMSAView
      const model = MSAModelF().create({
        type: 'MsaView',
        msaFilehandle: { uri: 'http://path/to/msa.stock' },
        treeFilehandle: { uri: 'http://path/to/tree.nh' },
      })

      model.setWidth(1800)
      const root = createRoot(document.getElementById('root'))
      root.render(React.createElement(MSAView, { model }))
    </script>
  </body>
</html>
```

## R package (msaviewr)

An R htmlwidget that takes ape, Biostrings, ggtree, and treeio objects directly.
See the [R package guide](https://gmod.org/JBrowseMSA/r-package) for
installation and examples.

## Color schemes

**Protein:** clustal, maeditor, lesk, cinema, flower, clustalx_protein,
jalview_taylor, jalview_zappo, jalview_hydrophobicity, jalview_buried,
jalview_prophelix, jalview_propstrand, jalview_propturn

**Nucleotide:** nucleotide, jbrowse_dna, rainbow_dna, clustalx_dna

**Dynamic (per-column):** clustalx_protein_dynamic, percent_identity_dynamic

## API

See the auto-generated API docs:
[packages/lib/apidocs/MsaView.md](https://github.com/GMOD/JBrowseMSA/blob/main/packages/lib/apidocs/MsaView.md)

The model source is in `packages/lib/src/model.ts`. The React-MSAView package
uses MobX-state-tree models. Components wrapped with `observer` from mobx-react
automatically re-render when observed model properties change.

## See also

- [Interactive examples](https://gmod.org/JBrowseMSA/examples) — copyable source
  for each usage pattern shown above.
- [Model API reference](https://github.com/GMOD/JBrowseMSA/blob/main/packages/lib/apidocs/MsaView.md)
  — the auto-generated state-model docs.
