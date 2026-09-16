# Layers that take data

The viewer should stop adding analysis features and serve as the render target
an agent writes into. JBrowse Desktop already works this way over MCP: one
`run_javascript` tool against the live session, and a value the agent computed
becomes a track through a `FromConfigAdapter` whose features sit in the track
config, so the track saves and reopens with the session
(`~/src/jbrowse-components/website/docs/agents_recipes.md`, "Show a value you
computed as a track"). The MSA equivalent is a set of layers whose data is
stored in the snapshot, in coordinates an agent already has, and drawn by the
viewer's existing render paths.

## What already follows the pattern

- **Row features.** The CLI runs InterProScan, and the viewer draws whatever GFF
  arrives and has no domain-specific code. `data.gff` persists in the snapshot,
  `Annotation` carries the row name and 1-based residue coordinates, and
  `annotationsByRow` projects them into columns. Every other layer should follow
  the same contract.
- **Text tracks.** A Stockholm `#=GC` line becomes a per-column text track with
  its own color map (`adapterTrackModels`).
- **Row metadata.** `data.treeMetadata` is a JSON map from row name to string
  fields, parsed defensively, used today only to pick a display label.
- **Column highlights.** `highlightColumns` persists and draws through
  `renderMSAMouseover.ts`, so a shared link can mark specific columns.

## Gaps, and the layer for each

Each layer is a snapshot field. Every one draws in the live canvas and in
`renderToSvg.tsx`, so an agent can render an SVG and check its result.

### 1. Column tracks from values

The bar tracks are computed only: `barTrackValues` in `drawTracks.ts` switches
on two hardcoded ids. An agent that computed dN/dS, a variant density, or its
own conservation has nowhere to put it.

```json
"columnTracks": [
  {
    "id": "dnds",
    "name": "dN/dS",
    "kind": "bar",
    "values": [0.1, 0.4, ...],
    "max": 2,
    "color": "#6a51a3",
    "row": "human"
  },
  { "id": "frame", "name": "Codon frame", "kind": "text", "data": "123123...",
    "colors": { "1": "#ddd", "2": "#bbb", "3": "#999" } }
]
```

`values` index alignment columns unless `row` is given, in which case they index
that row's residues and `seqPosToGlobalCol` projects them, the same rule GFF
features follow. `max` normalizes; without it, the viewer treats the values as 0
to 1. The `text` kind is the existing Stockholm track with its data supplied
inline. The work is a `columnTracks` property, a getter that merges them into
`tracks`, one lookup in `barTrackValues`, and the `hideGaps` skip that text
tracks already do. A 30 kb genome alignment gives a 30k-element array, so the
same 50 kb snapshot rule as `DataModel` applies, with a `columnTracksFilehandle`
for anything bigger.

### 2. Row features with their own color and glyph

`fillPalette` assigns colors by accession from a fixed palette, so an agent
cannot color pathogenic features red and benign ones grey. GFF3 already has a
`color=` attribute convention (JBrowse and IGV both honor it). Read it into
`Annotation.color`, let it override the palette, and let `featureType` pick the
glyph: box for a domain, arrow for a gene, the existing exon path for `exon`. A
JSON `features: Annotation[]` field beside `data.gff` saves the agent
serializing to GFF, but GFF text stays the persisted form and the documented
one.

### 3. Row strips from metadata

`treeMetadata` holds the data, but no code draws it. A strip is a named metadata
key drawn as a colored column between the tree and the alignment, with a legend.
[panels-and-marks](panels-and-marks.md) carries the current design: the strip is
a `rowPanels` record of `kind: "strip"`, and the tint is a `rowTint` encoding.

```json
"rowStrips": [
  { "key": "clade", "colors": { "19B": "#e41a1c", "20A": "#377eb8" } },
  { "key": "host" },
  { "key": "date", "kind": "number", "range": ["2020-01-01", "2021-06-01"] }
]
```

A categorical key with no `colors` takes the ggplot palette in
`ggplotPalettes.ts`. One extra field, `tint: "clade"`, shades the row background
across tree label and alignment by that key, and that field covers all of
[row-group-coloring](row-group-coloring.md) as data. The strip canvas is a new
narrow panel that scrolls with `TreeCanvas`, so the portal rule for transformed
containers in `CLAUDE.md` applies to it.

### 4. Highlights with labels, in residue coordinates

`highlightColumns` is a list of column indices. An agent working from a variant
has a residue in a named row, not a column, and needs a label on it.

```json
"highlights": [
  { "row": "human", "start": 248, "end": 248, "label": "R248Q · 651/658 R" },
  { "start": 40, "end": 60, "label": "NES", "color": "rgba(0,120,255,0.25)" },
  { "rows": ["beluga", "dolphin"], "label": "frameshift carriers" }
]
```

With `row`, `start`/`end` are residue coordinates projected through
`seqPosToVisibleCol`. Without `row`, they are columns, which keeps
`highlightColumns` as the degenerate case. `rows` marks rows across the tree
label and the alignment. The label draws above the span in the track strip and
in the tree gutter for rows. The draw path is the persistent-highlight branch of
`renderMSAMouseover.ts`, plus a label pass.

### 5. Letter colors from a map

`colorSchemeName` is a string chosen from the built-in table. A
`customColorScheme: Record<string, string>` at the model level, the field text
tracks already accept, lets an agent color "the residues I care about" without
adding a scheme. The raster cache keys on the scheme, so the only other change
is adding the map to that key.

### Out of scope

A per-cell color matrix. A matrix generalizes everything above, but it breaks
the raster tile cache's key, is quadratic in the snapshot, and every real ask so
far decomposes into a row feature, a column track, or a highlight. Revisit if an
agent produces one that does not.

## The contract

- Every layer is a snapshot field. The standalone app writes the snapshot to
  `?data=`, the plugin takes the same fields through a session spec and through
  `run_javascript` on the live `MsaView` model, and the CLI should take a whole
  snapshot for `export-svg` instead of only `msa`, `tree`, and `gff`.
- A layer that names a row uses row-residue coordinates, 1-based inclusive as
  GFF is. The viewer projects them to columns, since it holds the gap structure.
- Large documents follow the `DataModel` rule: inline under 50 kb, otherwise a
  filehandle sibling.
- Every layer exports to SVG, and the SVG tests in
  `packages/lib/src/render*.test.tsx` cover each one.
- One page, written for an agent, lists the fields with one example each. The
  JBrowse `docs` tool serves its reference from inside the app; the equivalent
  here is a markdown page in the package that an MCP host can bundle and that
  `llms.txt` on the website points at.

## Order

1. Column tracks from values. Shipped 2026-09-01 as `columnTracks`.
2. Highlights in residue coordinates with labels. Shipped 2026-09-01 as
   `highlights`; `highlightColumns` stays as the legacy 0-based column case.
3. GFF `color`, then JSON features.
4. Row strips and tint.
5. `export-svg` from a snapshot, so an agent can render what it wrote.
6. Letter color map.

## What it changes in the backlog

- [row-group-coloring](row-group-coloring.md) becomes the `tint` field of
  layer 3.
- [find-and-search](find-and-search.md) and
  [codon-aware-dna-view](codon-aware-dna-view.md) are things an agent computes
  and pushes as highlights and a text track. They stop being viewer features.
- [selection-model](selection-model.md) stays. It covers the human-to-agent
  direction: the person selects cells, the snapshot stores the selection, and
  the agent reads it back.
- [neighbor-joining-scaling](neighbor-joining-scaling.md) loses urgency, since
  an agent can supply the tree as an input.
