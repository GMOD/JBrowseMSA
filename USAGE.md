# Usage

## Zero-config component (recommended)

The simplest way to use react-msaview in a React app. Handles model
creation, width measurement, and theming automatically.

```sh
npm install react-msaview @jbrowse/core @mui/material react react-dom @emotion/styled @emotion/react
```

```tsx
import { MSAViewer } from 'react-msaview'

export default function App() {
  return (
    <MSAViewer
      msa=">human\nMKAA\n>mouse\nMKAG"
      tree="(human:0.1,mouse:0.2);"
      colorScheme="clustal"
    />
  )
}
```

Props:

| Prop | Type | Description |
|------|------|-------------|
| `msa` | `string` | Alignment text (FASTA, Stockholm, or Clustal) |
| `tree` | `string` | Newick tree text |
| `msaFilehandle` | `FileLocation` | Remote file location for alignment |
| `treeFilehandle` | `FileLocation` | Remote file location for tree |
| `colorScheme` | `string` | Color scheme name (see below) |
| `height` | `number` | Widget height in pixels |

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

An R htmlwidget package is available in `packages/r-msaview/`. It works
with ape, Biostrings, ggtree, and treeio objects.

```r
library(msaviewr)

# from strings
msaview(msa = ">s1\nACGT\n>s2\nACGA", tree = "(s1,s2);")

# from ape phylo
library(ape)
tree <- rtree(15)
seqs <- setNames(
  replicate(15, paste0(sample(c("A","C","G","T"), 300, TRUE), collapse = "")),
  tree$tip.label
)
msaview(msa = seqs, tree = tree, color_scheme = "nucleotide")

# from a ggtree plot object
library(ggtree)
p <- ggtree(tree) + geom_tiplab()
msaview(msa = seqs, tree = p)

# from Biostrings
library(Biostrings)
aa <- readAAStringSet("proteins.fasta")
msaview(msa = aa, color_scheme = "clustal")
```

See [packages/r-msaview/README.md](packages/r-msaview/README.md) for full
documentation.

## Color schemes

**Protein:** maeditor, clustal, lesk, cinema, flower, buried, taylor,
hydrophobicity, helix, strand, turn

**Nucleotide:** nucleotide, purine\_pyrimidine, rainbow\_dna, rainbow\_rna

**Dynamic (per-column):** clustalx\_protein\_dynamic, percent\_identity\_dynamic

## API

See the auto-generated API docs:
[packages/lib/apidocs/MsaView.md](packages/lib/apidocs/MsaView.md)

The model source is in `packages/lib/src/model.ts`. The React-MSAView
package uses MobX-state-tree models. Components wrapped with `observer`
from mobx-react automatically re-render when observed model properties
change.
