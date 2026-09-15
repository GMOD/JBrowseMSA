# Usage

## Zero-config component (recommended)

The simplest way to use react-msaview in a React app. Handles model creation,
width measurement, and theming automatically.

```sh
npm install react-msaview @jbrowse/core@next mobx@7 mobx-react@10 \
  @jbrowse/mobx-state-tree@6 @mui/material@9 @mui/icons-material@9 \
  @emotion/react @emotion/styled react react-dom
```

The line pins the majors because the viewer shares mobx, mobx-state-tree and MUI
with `@jbrowse/core`, and the app needs exactly one copy of each. With two
copies of mobx-state-tree, the first render throws "Identifier types can only be
instantiated as direct child of a model type". With two copies of MUI, a theme
built by one copy reaches components from the other, which also throws. The
versions above are the ones `@jbrowse/core` 5 depends on, and react-msaview
needs mobx 7. Core 5 is published under the `next` tag until its release, after
which `@jbrowse/core@5` replaces `@next`. Without the pins, npm resolves each
peer to its own latest major and installs a second copy.

CI installs exactly this line outside the workspace with plain npm and renders
the snippet below in a headless browser (`scripts/npm-smoke.mjs`), so a broken
install line fails CI.

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

| Prop                | Type                     | Description                                                               |
| ------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `msa`               | `string`                 | Alignment text (FASTA, Stockholm, Clustal, A3M, EMF)                      |
| `tree`              | `string`                 | Newick tree text                                                          |
| `gff`               | `string`                 | Annotations to overlay (GFF3 text)                                        |
| `msaFilehandle`     | `FileLocation`           | Remote file location for alignment                                        |
| `treeFilehandle`    | `FileLocation`           | Remote file location for tree                                             |
| `gffFilehandle`     | `FileLocation`           | Remote file location for domain GFF                                       |
| `colorScheme`       | `string`                 | Color scheme name (see below)                                             |
| `height`            | `number`                 | Widget height in pixels                                                   |
| `colWidth`          | `number`                 | Per-column width in pixels (horizontal zoom)                              |
| `rowHeight`         | `number`                 | Per-row height in pixels (vertical zoom)                                  |
| `allowedGappyness`  | `number`                 | Hide columns at least this percent gaps (default 100, hide nothing)       |
| `relativeTo`        | `string`                 | Row name to diff every other row against; matches draw as `.`             |
| `drawTree`          | `boolean`                | Draw the phylogeny (default true); false leaves a label gutter            |
| `treeAreaWidth`     | `number`                 | Fixed width of the tree/label gutter                                      |
| `autoTreeAreaWidth` | `boolean`                | Size that gutter to the labels; pair with `drawTree: false`               |
| `columnTracks`      | `ColumnTrackSpec[]`      | Tracks supplied as data (see below)                                       |
| `highlights`        | `Highlight[]`            | Labeled highlights (see below)                                            |
| `highlightColumns`  | `number[]`               | Columns (0-based) under a persistent overlay                              |
| `residueMappings`   | `ResidueMapping[]`       | Structure residue for each residue of a row                               |
| `showBranchLen`     | `boolean`                | Draw branch lengths (default true); false draws a cladogram               |
| `hideHeader`        | `boolean`                | Leave out the toolbar, for a page drawing its own controls                |
| `theme`             | `string \| ThemeOptions` | `'light'` (default), `'dark'`, or MUI theme options merged over JBrowse's |
| `onCellHover`       | `(cell) => void`         | The cell under the pointer (see below)                                    |
| `onCellClick`       | `(cell) => void`         | The cell a click pinned, or `undefined` when a click clears it            |
| `onViewportChange`  | `(viewport) => void`     | The alignment columns on screen                                           |

The viewer applies a changed prop to the mounted model, so a host can put a
control on one without re-fetching the alignment. Each prop updates only its own
setting, so the host's next render keeps a change made inside the viewer, such
as a scheme picked from the menu or a row dragged taller. The viewer compares
the data layers (`highlights`, `columnTracks`, `residueMappings`,
`highlightColumns`) and the filehandles by content, so passing a freshly
computed array or location object on every render costs nothing. A new `msa`,
`tree` or `gff` string, or a filehandle pointing somewhere else, builds a new
model and resets the view.

### Events

`onCellHover` and `onCellClick` receive a `Cell` in the coordinates highlights
use: `column` is the 1-based column of the file, counting hidden gappy columns,
and `residue` is the 1-based position in that row's own sequence, absent on a
gap. A pointer over a track gives a column and no row. `onViewportChange`
receives `{startColumn, endColumn}`, 1-based and inclusive, after each scroll,
zoom and resize that changes them.

```tsx
const [clicked, setClicked] = useState<Cell>()

return (
  <>
    <MSAViewer msa={msa} tree={tree} hideHeader onCellClick={setClicked} />
    {clicked?.residue ? (
      <p>
        {clicked.row} residue {clicked.residue} ({clicked.letter})
      </p>
    ) : null}
  </>
)
```

### Data layers

`highlights`, `columnTracks` and `residueMappings` take data the host computed:
a labeled band over a residue or column range, a bar, text or arc track above
the alignment, and the residue-by-residue correspondence between a row and a
structure. Each is also a model property, so it travels in a shared URL and the
SVG export draws it.

```tsx
<MSAViewer
  msa={msa}
  tree={tree}
  highlights={[
    { row: 'human', start: 248, end: 248, label: 'R248Q · 651/658 R' },
    { start: 40, end: 60, label: 'NES', color: 'rgba(0,120,255,0.25)' },
    { rows: ['beluga', 'dolphin'], label: 'frameshift carriers' },
  ]}
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

The [layers reference](https://gmod.org/JBrowseMSA/layers) lists every field of
every layer and the coordinate rules they share. At runtime
`model.setHighlights(list)` and `model.setColumnTracks(tracks)` replace what the
props set.

### One panel in your own page

A purpose-built page usually shows less than the standalone app. With the
phylogeny off, the gutter holds only the row labels and sizes itself to them:

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

Both toggles update the mounted viewer, so flipping one does not re-fetch the
alignment. Use `drawTree={false}` with `autoTreeAreaWidth` whenever there is no
tree to draw, such as for a reference-projected reconstruction with no
meaningful guide tree. Without `autoTreeAreaWidth` the gutter keeps its full
default width.

The component pulls in `@jbrowse/core`, MUI and mobx and renders to canvas, so
in a server-rendered app (Next.js, Astro, Remix) load it on the client only,
with `React.lazy` inside a `Suspense` or the framework's equivalent.

## Advanced: model-based API

For state the props do not cover, such as hiding gappy columns, collapsing
clades or reading what the user selected, use `MSAModelF` directly.

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

// transient highlights, keyed by owner, so a structure viewer's hover and a
// genome view's each clear only their own. Not persisted, unlike the
// `highlights` prop.
model.applyHighlight('protein3d', [{ row: 'human', start: 58, end: 58 }])
model.clearHighlight('protein3d')
```

## Using react-msaview in a plain HTML file with UMD bundle

`mount` renders `MSAViewer` into an element and takes the same props. `update`
merges new props over the current ones, and `destroy` unmounts the viewer.

```html
<html>
  <head>
    <script
      crossorigin
      src="https://unpkg.com/react-msaview/bundle/index.js"
    ></script>
  </head>
  <body>
    <div id="viewer"></div>
    <p id="clicked"></p>
    <script>
      const { mount } = window.ReactMSAView
      const viewer = mount(document.getElementById('viewer'), {
        msaFilehandle: { uri: 'http://path/to/msa.stock' },
        treeFilehandle: { uri: 'http://path/to/tree.nh' },
        height: 400,
        onCellClick: cell => {
          document.getElementById('clicked').textContent = cell
            ? `${cell.row} residue ${cell.residue}`
            : ''
        },
      })
      viewer.update({ colorScheme: 'clustal' })
    </script>
  </body>
</html>
```

The bundle also exports `MSAModelF`, `MSAView`, `React` and `createRoot` for a
page that builds the model itself, as in the model-based API above.

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

- [Interactive examples](https://gmod.org/JBrowseMSA/examples): copyable source
  for each usage pattern shown above.
- [User guide](https://gmod.org/JBrowseMSA/guide): a tour of the app, file
  formats, and features.
