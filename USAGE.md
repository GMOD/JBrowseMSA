# Usage

## Zero-config component (recommended)

The simplest way to use react-msaview in a React app. Handles model creation,
width measurement, and theming automatically.

```sh
npm install react-msaview @jbrowse/core@4 mobx@6 mobx-react@9 \
  @jbrowse/mobx-state-tree@5 @mui/material@7 @mui/icons-material@7 \
  @emotion/react @emotion/styled react react-dom
```

The majors are pinned because the viewer shares mobx, mobx-state-tree and MUI
with `@jbrowse/core`, and there has to be exactly one copy of each. Two copies
of mobx-state-tree and the first render throws "Identifier types can only be
instantiated as direct child of a model type"; two copies of MUI and a theme
built by one reaches components from the other, which throws too. The versions
above are the ones `@jbrowse/core` 4 depends on. Core 5 moves the set together
to mobx 7, `@jbrowse/mobx-state-tree` 6 and MUI 9; install those majors together
and the same rule holds. Left unpinned, npm resolves each peer to its own latest
and hands you the two-copy tree.

CI installs exactly this line outside the workspace with plain npm and renders
the snippet below in a headless browser (`scripts/npm-smoke.mjs`), so it is
tested rather than remembered.

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

| Prop                | Type                | Description                                                          |
| ------------------- | ------------------- | -------------------------------------------------------------------- |
| `msa`               | `string`            | Alignment text (FASTA, Stockholm, Clustal, A3M, EMF)                 |
| `tree`              | `string`            | Newick tree text                                                     |
| `gff`               | `string`            | InterProScan domain annotations (GFF3 text)                          |
| `msaFilehandle`     | `FileLocation`      | Remote file location for alignment                                   |
| `treeFilehandle`    | `FileLocation`      | Remote file location for tree                                        |
| `gffFilehandle`     | `FileLocation`      | Remote file location for domain GFF                                  |
| `colorScheme`       | `string`            | Color scheme name (see below)                                        |
| `height`            | `number`            | Widget height in pixels                                              |
| `colWidth`          | `number`            | Per-column width in pixels (horizontal zoom)                         |
| `rowHeight`         | `number`            | Per-row height in pixels (vertical zoom)                             |
| `relativeTo`        | `string`            | Row name to diff every other row against; matches draw as `.`        |
| `drawTree`          | `boolean`           | Draw the phylogeny (default true); false leaves a label gutter       |
| `treeAreaWidth`     | `number`            | Fixed width of the tree/label gutter                                 |
| `autoTreeAreaWidth` | `boolean`           | Size that gutter to the labels instead — pair with `drawTree: false` |
| `columnTracks`      | `ColumnTrackSpec[]` | Tracks supplied as data (see below)                                  |
| `highlights`        | `Highlight[]`       | Labeled highlights (see below)                                       |
| `highlightColumns`  | `number[]`          | Columns (0-based) under a persistent overlay                         |

`height`, `colorScheme`, `colWidth`, `rowHeight`, `relativeTo`, `drawTree` and
`treeAreaWidth` stay live: change one and the viewer follows, so a host can put
a control on it without remounting and re-fetching the alignment. Each follows
only its own prop, so a change the reader makes inside the viewer — a scheme
picked from the menu, a row dragged taller — is not undone by the host's next
render. The data props are not among them: a new `msa`/`tree`/`gff` is a
different alignment, which is a new model, which React spells `key`.

### Highlights

Point at a residue, a column range, or a set of rows, with a label. Coordinates
are 1-based and inclusive, as in GFF. With `row`, `start` and `end` are residues
of that sequence and the viewer projects them through the alignment's gaps;
without it they are alignment columns. `rows` tints whole rows instead.

```tsx
<MSAViewer
  msa={msa}
  tree={tree}
  highlights={[
    { row: 'human', start: 248, end: 248, label: 'R248Q · 651/658 R' },
    { start: 40, end: 60, label: 'NES', color: 'rgba(0,120,255,0.25)' },
    { rows: ['beluga', 'dolphin'], label: 'frameshift carriers' },
  ]}
/>
```

The list lives in the model snapshot (`model.setHighlights(...)` changes it), so
a shared URL carries it, and the SVG export draws it. The full set of data
layers is in [layers reference](https://gmod.org/JBrowseMSA/layers).

### One panel in your own page

A purpose-built page usually wants less than the standalone app shows. Turn the
phylogeny off and the gutter holds just the row labels, sized to them:

```tsx
const [expanded, setExpanded] = useState(false)
const [diff, setDiff] = useState(false)

return (
  <>
    <button onClick={() => setDiff(d => !d)}>Diff vs reference</button>
    <button onClick={() => setExpanded(e => !e)}>
      {expanded ? 'Collapse' : 'Expand'}
    </button>
    <MSAViewer
      msaFilehandle={{ uri: msaUrl, locationType: 'UriLocation' }}
      gffFilehandle={{ uri: gffUrl, locationType: 'UriLocation' }}
      colorScheme="clustalx_dna"
      drawTree={false}
      autoTreeAreaWidth
      relativeTo={diff ? referenceRow : undefined}
      height={expanded ? 760 : 420}
    />
  </>
)
```

Both toggles drive the mounted viewer, so flipping one does not re-fetch the
alignment. `drawTree={false}` with `autoTreeAreaWidth` is the pairing to reach
for whenever there is no tree to draw — a reference-projected reconstruction has
no meaningful guide tree, and without it the gutter would otherwise reserve its
full default width for a tree that never appears.

The component pulls in `@jbrowse/core`, MUI and mobx and renders to canvas, so
in a server-rendered app (Next.js, Astro, Remix) load it client-side only —
`React.lazy` inside a `Suspense`, or the framework's equivalent.

## Advanced: model-based API

For state the props do not cover — hiding gappy columns, collapsing clades,
reading what the user selected — use `MSAModelF` directly.

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

// transient highlights, keyed by whoever is asking. Two sources -- a structure
// viewer's hover, a genome view's -- each add and remove only their own, so
// neither erases the other. Not persisted; the `highlights` prop is the
// persisted list.
model.applyHighlight('protein3d', [{ row: 'human', start: 58, end: 58 }])
model.clearHighlight('protein3d')
```

## Tracks from your own data

Anything computed per column, or per residue of one row, draws as a track above
the alignment. The viewer scales, places, and exports it and computes nothing.

```tsx
<MSAViewer
  msa={msa}
  columnTracks={[
    {
      id: 'dnds',
      name: 'dN/dS',
      kind: 'bar',
      values: dnds,
      max: 2,
      row: 'human',
    },
  ]}
/>
```

`kind: 'text'` takes `data`, one character per column, with an optional `colors`
map. `model.setColumnTracks(tracks)` replaces the set at runtime. The
[layers reference](https://gmod.org/JBrowseMSA/layers) lists every field.

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

The model source is in `packages/lib/src/model.ts`. react-msaview uses
MobX-state-tree models; components wrapped with `observer` from mobx-react
automatically re-render when observed model properties change.

## See also

- [Interactive examples](https://gmod.org/JBrowseMSA/examples) — copyable source
  for each usage pattern shown above.
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the app, file
  formats, and features.
