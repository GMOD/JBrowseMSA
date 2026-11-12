# Usage

## Zero-config component (recommended)

The simplest way to use react-msaview in a React app. Handles model creation,
width measurement, and theming automatically.

```sh
npm install react-msaview @jbrowse/core@next mobx@7 mobx-react@10 \
  @jbrowse/mobx-state-tree@6 @mui/material@9 @mui/icons-material@9 \
  @emotion/react @emotion/styled react react-dom
```

```tsx
import { MSAViewer } from 'react-msaview'

export default function App() {
  // backticks, so each \n becomes a newline
  return (
    <MSAViewer
      msa={`>human\nMKAANSE\n>mouse\nMKA-NSE`}
      tree="(human:0.1,mouse:0.2);"
      colorScheme="clustal"
    />
  )
}
```

A file the browser can fetch goes in by URL:

```tsx
<MSAViewer
  msaUrl="https://jbrowse.org/genomes/multiple_sequence_alignments/pfam-cov2.stock"
  gffUrl="https://jbrowse.org/genomes/multiple_sequence_alignments/pfam-cov2-domains.gff"
/>
```

The install line pins the majors the viewer shares with `@jbrowse/core`;
[Troubleshooting](#troubleshooting) lists the errors a second copy throws.

Props:

| Prop                | Type                        | Description                                                                         |
| ------------------- | --------------------------- | ----------------------------------------------------------------------------------- |
| `msa`               | `string`                    | Alignment text (FASTA, Stockholm, Clustal, A3M, EMF)                                |
| `tree`              | `string`                    | Newick tree text                                                                    |
| `gff`               | `string`                    | Annotations to overlay (GFF3 text)                                                  |
| `features`          | `Feature[]`                 | Annotations as JSON: `{row, start, end, name, ...}`, drawn with the GFF's           |
| `msaFilehandle`     | `FileLocation`              | Remote file location for alignment                                                  |
| `treeFilehandle`    | `FileLocation`              | Remote file location for tree                                                       |
| `gffFilehandle`     | `FileLocation`              | Remote file location for domain GFF                                                 |
| `msaUrl`            | `string`                    | URL of the alignment; `msaFilehandle` wins when both are set                        |
| `treeUrl`           | `string`                    | URL of the Newick tree; `treeFilehandle` wins when both are set                     |
| `gffUrl`            | `string`                    | URL of the GFF; `gffFilehandle` wins when both are set                              |
| `colorScheme`       | `string \| {domain, range}` | Color scheme name, or a color per residue letter (see below)                        |
| `height`            | `number`                    | Widget height in pixels                                                             |
| `colWidth`          | `number`                    | Per-column width in pixels (horizontal zoom)                                        |
| `rowHeight`         | `number`                    | Per-row height in pixels (vertical zoom)                                            |
| `allowedGappyness`  | `number`                    | Hide columns at least this percent gaps (default 100, hide nothing)                 |
| `relativeTo`        | `string`                    | Row name to diff every other row against; matches draw as `.`                       |
| `drawTree`          | `boolean`                   | Draw the phylogeny (default true); false leaves a label gutter                      |
| `treeAreaWidth`     | `number`                    | Fixed width of the tree/label gutter; unset fits it to the labels and the tree      |
| `columnTracks`      | `ColumnTrackSpec[]`         | Tracks supplied as data (see below)                                                 |
| `highlights`        | `Highlight[]`               | Labeled highlights (see below)                                                      |
| `highlightColumns`  | `number[]`                  | Columns (1-based, like `highlights`), one band per run of adjacent columns          |
| `clades`            | `Clade[]`                   | Tree clades with a mark over them                                                   |
| `residueMappings`   | `ResidueMapping[]`          | Structure residue for each residue of a row                                         |
| `rowData`           | `Record<string, ...>`       | Extra fields per row name, such as a lineage or a host                              |
| `encodings`         | `Encoding[]`                | What the marks read: `tipLabel`, `rowTint`, `branch`, `featureFill`, `featureLabel` |
| `rowPanels`         | `RowPanelSpec[]`            | Panels between the tree and the alignment, one cell per row                         |
| `rowTransform`      | `RowTransform`              | Filter, sort and facet the rows by `rowData` fields                                 |
| `showBranchLen`     | `boolean`                   | Draw branch lengths (default true); false draws a cladogram                         |
| `treeOrder`         | `TreeOrder`                 | Child order: `branchLength` (default), `input`, `ladderize`, `ladderizeReverse`     |
| `treeRoot`          | `TreeRoot`                  | Reroot: `'midpoint'`, or `{outgroup: [tip names]}`                                  |
| `residueEncoding`   | `'fill' \| 'color'`         | Which channel `colorScheme` paints: the cell (default) or the letter                |
| `region`            | `Region`                    | Zoom to `{row, start, end}` residues, or `{start, end}` columns                     |
| `selection`         | `MsaSelection`              | The selected block: `{start, end}` columns and optional `rows` names                |
| `hideHeader`        | `boolean`                   | Leave out the toolbar, for a page drawing its own controls                          |
| `theme`             | `string \| ThemeOptions`    | `'light'` (default), `'dark'`, or MUI theme options merged over JBrowse's           |
| `onCellHover`       | `(cell) => void`            | The cell under the pointer (see below)                                              |
| `onCellClick`       | `(cell) => void`            | The cell a click pinned, or `undefined` when a click clears it                      |
| `onViewportChange`  | `(viewport) => void`        | The alignment columns on screen                                                     |
| `onSelectionChange` | `(selection) => void`       | The selected block after each change, or `undefined` when it clears                 |
| `onModel`           | `(model) => void`           | The model the viewer built, for the model API below                                 |

The viewer applies a changed prop to the mounted model, so a host can put a
control on one without re-fetching the alignment. Each prop updates only its own
setting, so the host's next render keeps a change made inside the viewer, such
as a scheme picked from the menu or a row dragged taller. The viewer compares
the data layers (`highlights`, `features`, `clades`, `columnTracks`,
`residueMappings`, `rowData`, `encodings`, `rowPanels`, `rowTransform`,
`highlightColumns`), `selection`, `treeRoot` and the filehandles by content, so
passing a freshly computed array or location object on every render costs
nothing. A new `msa` or `tree` string, or an `msaUrl`, `treeUrl`,
`msaFilehandle` or `treeFilehandle` pointing somewhere else, builds a new model
and resets the view. A new `gff`, `gffUrl` or `gffFilehandle` replaces the
annotations and keeps the view.

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
      encoding: { y: { scale: { domainMax: 2 } } },
      row: 'human',
    },
  ]}
/>
```

`clades` marks a clade of the tree with a highlight, a bracket, a collapse or a
focus. `rowData` is a field table keyed by row name. `encodings` colors the tip
labels, rows and branches by a `rowData` field, and the annotation spans by a
field of the GFF. `rowPanels` draws per-row panels between the tree and the
alignment: colored strips, or the GFF's spans as gene arrows. `rowTransform`
filters the rows by a `rowData` field, and without a tree sorts them and stacks
them in labelled bands.

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
      msaUrl={msaUrl}
      gffUrl={gffUrl}
      colorScheme="clustalx_dna"
      drawTree={false}
      relativeTo={diff ? referenceRow : undefined}
      height={expanded ? 760 : 420}
    />
  </>
)
```

Both toggles update the mounted viewer, so flipping one does not re-fetch the
alignment. Use `drawTree={false}` whenever there is no tree to draw, such as for
a reference-projected reconstruction with no meaningful guide tree. The gutter
then fits the labels alone.

The component pulls in `@jbrowse/core`, MUI and mobx and renders to canvas, so
in a server-rendered app (Next.js, Astro, Remix) load it on the client only,
with `React.lazy` inside a `Suspense` or the framework's equivalent.

## Advanced: model-based API

For state the props do not cover, such as hiding gappy columns, collapsing
clades or reading what the user selected, use the model. A `ref` on `MSAViewer`
holds the model it built, and `onModel` reports each one, so the component still
measures the width and provides the theme. When a new alignment or tree builds a
new model, the ref holds that one.

```tsx
const viewer = useRef<MsaViewModel>(null)

return (
  <>
    <button onClick={() => viewer.current?.setHideGaps(true)}>Hide gaps</button>
    <MSAViewer ref={viewer} msaUrl={msaUrl} />
  </>
)
```

To build the model yourself, use `MSAModelF` and render it with `MSAView`, which
leaves setting the width to you:

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

`MSAView` takes `toolbarStart` and `toolbarEnd`, which render your own controls
at either end of the viewer's toolbar, so a host app's buttons sit in the
viewer's one bar:

```tsx
<MSAView model={model} toolbarEnd={<Button onClick={share}>Share</Button>} />
```

`MSAView` also takes `examples`, which renders your own node on the empty screen
where the file inputs are. It sits above the inputs by default, and
`examplesBelow` moves it under them. Without `examples`, the viewer lists its
built-in examples:

```tsx
<MSAView model={model} examples={<MyExamples />} examplesBelow />
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
        msaUrl: 'http://path/to/msa.stock',
        treeUrl: 'http://path/to/tree.nh',
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

The bundle is 452 KB gzipped. A page can show an SVG of the viewer's first
frame, drawn by `react-msaview-cli export-svg --props`, and load the bundle when
the reader clicks;
[An alignment on your own page, static first](https://gmod.org/JBrowseMSA/tutorials/static_first)
builds one and measures it.

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
`hide-header`, `theme`, `tree-area-width`, `reference-row` and `loading`.
Properties: `msa`, `tree` and `gff` text, `features`, `colorScheme`,
`highlights`, `columnTracks`, `residueMappings` and `selection`. The
`colorScheme` property takes the `{domain, range}` form the attribute cannot
hold, and while set it wins over the attribute. Reading `selection` gives the
block the reader selected. The element dispatches `cell-hover`, `cell-click`,
`viewport-change` and `selection-change` events whose `detail` is the value the
matching `MSAViewer` callback receives.

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

`loading="lazy"` mounts the viewer once the element comes within 200 pixels of
the viewport, the way `<img loading="lazy">` loads its image. Until then the
element shows its own children and reserves the viewer's height, so an `<img>`
of the first frame, drawn by `react-msaview-cli export-svg --viewport`, stands
in for it:

```html
<script
  async
  src="https://unpkg.com/react-msaview/bundle/index.js"
  onload="ReactMSAView.defineMsaElement()"
></script>

<jbrowse-msa
  loading="lazy"
  height="360"
  hide-header
  msa-url="https://example.org/family.aln"
  tree-url="https://example.org/family.nh"
>
  <img src="family.svg" alt="The family's alignment under its tree" />
</jbrowse-msa>
```

The `async` script leaves the page's first paint to the image, and the viewer
fetches its files and builds its model only when the reader scrolls near it.

## R package (ggmsaview)

[ggmsaview](https://gmod.org/JBrowseMSA/r-package) wraps MSAViewer as an R
htmlwidget that takes ape, Biostrings, ggtree and treeio objects directly, and
draws the same view as a ggplot2 figure.

## Color schemes

**Protein:** clustal, maeditor, lesk, cinema, flower, clustalx_protein,
jalview_taylor, jalview_zappo, jalview_hydrophobicity, jalview_buried,
jalview_prophelix, jalview_propstrand, jalview_propturn

**Nucleotide:** nucleotide, jbrowse_dna, rainbow_dna, clustalx_dna

**Dynamic (per-column):** clustalx_protein_dynamic, percent_identity_dynamic,
blosum62_dynamic

**No residue colors:** none

### A color per letter

`colorScheme` also takes a color object over residue letters, `domain` naming
the letters and `range` their colors, for coloring only the residues a host
cares about:

```tsx
<MSAViewer
  msa={msa}
  colorScheme={{
    domain: ['K', 'R', 'D'],
    range: ['#1f77b4', '#1f77b4', '#d62728'],
  }}
/>
```

The viewer upper-cases every row before coloring it, as the built-in schemes
expect, so a listed letter matches in either case: `k` or `K` colors every
lysine, whether the file writes it `k` or `K`. Every letter `domain` leaves out
is uncolored, gaps included; list `-` and `.` to color them. The model stores
the letters and colors as the map `customColorScheme`, and picking a scheme
under **Settings → Color** clears it.

### Painting another view with the scheme

`schemeResidueColor(model)` returns a function from a row name and a 1-based
residue to the hex color the active scheme gives that residue, or `undefined`
where the scheme leaves it uncolored or its column is hidden. Call it inside a
MobX reaction and a new scheme, a hidden gap column or a collapsed clade re-runs
the caller. The
[structure link page](https://gmod.org/JBrowseMSA/tutorials/structure_link) uses
it with `rowResidue` to paint a Mol\* structure in the alignment's colors.

## Troubleshooting

### Two copies of mobx-state-tree or MUI

The viewer shares mobx, mobx-state-tree and MUI with `@jbrowse/core`, and the
app needs exactly one copy of each. The install line in the
[zero-config section](#zero-config-component-recommended) pins those majors.
Without the pins, npm resolves each peer to its own latest major and installs a
second copy:

- Two copies of mobx-state-tree: the first render throws "Identifier types can
  only be instantiated as direct child of a model type".
- Two copies of MUI: a theme built by one copy reaches components from the
  other, which also throws.

The pinned versions are the ones `@jbrowse/core` 5 depends on, and react-msaview
needs mobx 7. Core 5 is published under the `next` tag until its release, after
which `@jbrowse/core@5` replaces `@next`.

CI installs that line outside the workspace with plain npm and renders the quick
start in a headless browser (`scripts/npm-smoke.mjs`), so a broken install line
fails CI.

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
