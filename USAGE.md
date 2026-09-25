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

| Prop                | Type                     | Description                                                                         |
| ------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `msa`               | `string`                 | Alignment text (FASTA, Stockholm, Clustal, A3M, EMF)                                |
| `tree`              | `string`                 | Newick tree text                                                                    |
| `gff`               | `string`                 | Annotations to overlay (GFF3 text)                                                  |
| `msaFilehandle`     | `FileLocation`           | Remote file location for alignment                                                  |
| `treeFilehandle`    | `FileLocation`           | Remote file location for tree                                                       |
| `gffFilehandle`     | `FileLocation`           | Remote file location for domain GFF                                                 |
| `colorScheme`       | `string \| {map}`        | Color scheme name, or a color per residue letter (see below)                        |
| `height`            | `number`                 | Widget height in pixels                                                             |
| `colWidth`          | `number`                 | Per-column width in pixels (horizontal zoom)                                        |
| `rowHeight`         | `number`                 | Per-row height in pixels (vertical zoom)                                            |
| `allowedGappyness`  | `number`                 | Hide columns at least this percent gaps (default 100, hide nothing)                 |
| `relativeTo`        | `string`                 | Row name to diff every other row against; matches draw as `.`                       |
| `drawTree`          | `boolean`                | Draw the phylogeny (default true); false leaves a label gutter                      |
| `treeAreaWidth`     | `number`                 | Fixed width of the tree/label gutter                                                |
| `autoTreeAreaWidth` | `boolean`                | Size that gutter to the labels; pair with `drawTree: false`                         |
| `columnTracks`      | `ColumnTrackSpec[]`      | Tracks supplied as data (see below)                                                 |
| `highlights`        | `Highlight[]`            | Labeled highlights (see below)                                                      |
| `highlightColumns`  | `number[]`               | Columns (0-based) under a persistent overlay                                        |
| `clades`            | `Clade[]`                | Tree clades with a mark over them                                                   |
| `residueMappings`   | `ResidueMapping[]`       | Structure residue for each residue of a row                                         |
| `rowData`           | `Record<string, ...>`    | Extra fields per row name, such as a lineage or a host                              |
| `encodings`         | `Encoding[]`             | What the marks read: `tipLabel`, `rowTint`, `branch`, `featureFill`, `featureLabel` |
| `rowPanels`         | `RowPanelSpec[]`         | Panels between the tree and the alignment, one cell per row                         |
| `showBranchLen`     | `boolean`                | Draw branch lengths (default true); false draws a cladogram                         |
| `treeOrder`         | `TreeOrder`              | Child order: `branchLength` (default), `input`, `ladderize`, `ladderizeReverse`     |
| `treeRoot`          | `TreeRoot`               | Reroot: `'midpoint'`, or `{outgroup: [tip names]}`                                  |
| `residueEncoding`   | `'fill' \| 'color'`      | Which channel `colorScheme` paints: the cell (default) or the letter                |
| `region`            | `Region`                 | Zoom to `{row, start, end}` residues, or `{start, end}` columns                     |
| `selection`         | `MsaSelection`           | The selected block: `{start, end}` columns and optional `rows` names                |
| `hideHeader`        | `boolean`                | Leave out the toolbar, for a page drawing its own controls                          |
| `theme`             | `string \| ThemeOptions` | `'light'` (default), `'dark'`, or MUI theme options merged over JBrowse's           |
| `onCellHover`       | `(cell) => void`         | The cell under the pointer (see below)                                              |
| `onCellClick`       | `(cell) => void`         | The cell a click pinned, or `undefined` when a click clears it                      |
| `onViewportChange`  | `(viewport) => void`     | The alignment columns on screen                                                     |
| `onSelectionChange` | `(selection) => void`    | The selected block after each change, or `undefined` when it clears                 |
| `onModel`           | `(model) => void`        | The model the viewer built, for the model API below                                 |

The viewer applies a changed prop to the mounted model, so a host can put a
control on one without re-fetching the alignment. Each prop updates only its own
setting, so the host's next render keeps a change made inside the viewer, such
as a scheme picked from the menu or a row dragged taller. The viewer compares
the data layers (`highlights`, `clades`, `columnTracks`, `residueMappings`,
`rowData`, `encodings`, `rowPanels`, `highlightColumns`), `selection`,
`treeRoot` and the filehandles by content, so passing a freshly computed array
or location object on every render costs nothing. A new `msa`, `tree` or `gff`
string, or a filehandle pointing somewhere else, builds a new model and resets
the view.

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

`onSelectionChange` receives the block the reader selected, in the coordinates
of the `selection` prop: `start` and `end` count the file's columns, hidden
gappy ones included, and `rows` names the selected rows, absent when the block
spans every row. A shift-drag on the alignment selects a block, a drag along a
track selects columns across every row, and Escape clears it. Pass the value
back as `selection` to keep it in the host's state. The viewer compares the prop
by content, so passing back the value it reported leaves the view as it is.

```tsx
const [selection, setSelection] = useState<MsaSelection>()

return (
  <MSAViewer msa={msa} selection={selection} onSelectionChange={setSelection} />
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

`clades` marks a clade of the tree with a highlight, a bracket, a collapse or a
focus. `rowData` is a field table keyed by row name. `encodings` colors the tip
labels, rows and branches by a `rowData` field, and the annotation spans by a
field of the GFF. `rowPanels` draws per-row panels between the tree and the
alignment: colored strips, or the GFF's spans as gene arrows.

The [layers reference](https://gmod.org/JBrowseMSA/layers) lists every field of
every layer, with examples, and the coordinate rules they share. At runtime
`model.setHighlights(list)`, `model.setClades(list)`,
`model.setColumnTracks(tracks)`, `model.setRowData(table)` and
`model.setRowPanels(panels)` replace what the props set.

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
clades or reading what the user selected, use the model. `onModel` hands over
the model `MSAViewer` built, which keeps the width measurement and theme the
component provides. To build the model yourself, use `MSAModelF` and render it
with `MSAView`, which leaves setting the width to you:

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

## As a custom element

`defineMsaElement()` registers `<jbrowse-msa>`, which renders `MSAViewer` from
attributes and properties, for a page that writes HTML instead of JavaScript
components.

```html
<script src="https://unpkg.com/react-msaview/bundle/index.js"></script>
<script>
  window.ReactMSAView.defineMsaElement()
</script>

<jbrowse-msa
  msa-url="https://example.org/family.stock"
  tree-url="https://example.org/family.nh"
  color-scheme="clustalx_protein_dynamic"
  height="400"
  hide-header
></jbrowse-msa>
```

Attributes: `msa-url`, `tree-url`, `gff-url`, `color-scheme`, `height`,
`hide-header`, `theme`, `tree-area-width` and `reference-row`. Properties:
`msa`, `tree` and `gff` text, `colorScheme`, `highlights`, `columnTracks`,
`residueMappings` and `selection`. The `colorScheme` property takes the `{map}`
form the attribute cannot hold, and while set it wins over the attribute.
Reading `selection` gives the block the reader selected. The element dispatches
`cell-hover`, `cell-click`, `viewport-change` and `selection-change` events
whose `detail` is the value the matching `MSAViewer` callback receives.

Inside a [Nightingale](https://github.com/ebi-webcomponents/nightingale)
`<nightingale-manager>`, the element registers with the manager like a
Nightingale component. It follows the `display-start`, `display-end` and
`highlight` attributes the manager writes, and reports its own range and hovered
residue back as `change` events. Nightingale positions count the residues of one
protein, so `reference-row` names the alignment row that protein is, and the
element converts between its residues and the alignment's columns. Give the
manager `reflected-attributes="display-start,display-end,highlight"`. The
examples page has a live one beside Nightingale's navigation and sequence
tracks.

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

**No residue colors:** none

### A color per letter

`colorScheme` also takes `{map}`, a color per residue letter, for coloring only
the residues a host cares about:

```tsx
<MSAViewer
  msa={msa}
  colorScheme={{ map: { K: '#1f77b4', R: '#1f77b4', D: '#d62728' } }}
/>
```

The viewer upper-cases every row before coloring it, as the built-in schemes
expect, so a map's letters match in either case: `k` or `K` colors every lysine,
whether the file writes it `k` or `K`. Every letter the map leaves out is
uncolored, gaps included; list `-` and `.` to color them. The model stores the
map as `customColorScheme`, and picking a scheme from the palette menu clears
it.

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
