# Layers that take data

The viewer should stop growing analysis and become the render target an agent
writes into. JBrowse Desktop already works this way over MCP: one
`run_javascript` tool against the live session, and a value the agent computed
becomes a track through a `FromConfigAdapter` whose features sit in the track
config, so it saves and reopens with the session
(`~/src/jbrowse-components/website/docs/agents_recipes.md`, "Show a value you
computed as a track"). The MSA equivalent is a set of layers whose data lives in
the snapshot, in coordinates an agent already has, drawn by paths the viewer
already owns.

## What already follows the pattern

- **Row features.** The CLI runs InterProScan, the viewer draws whatever GFF
  arrives, and nothing in the viewer knows what a domain is. `data.gff` persists
  in the snapshot, `Annotation` carries the row name and 1-based residue
  coordinates, and `annotationsByRow` projects them into columns. This is the
  contract every other layer should copy.
- **Text tracks.** A Stockholm `#=GC` line becomes a per-column text track with
  its own color map (`adapterTrackModels`).
- **Row metadata.** `data.treeMetadata` is a JSON map from row name to string
  fields, parsed defensively, used today only to pick a display label.
- **Column highlights.** `highlightColumns` persists, draws through
  `renderMSAMouseover.ts`, and is what makes a link point at something.

## What does not, and the layer that fixes it

Each layer is a snapshot field. Every one draws in the live canvas and in
`renderToSvg.tsx`, since an agent that cannot see its own output cannot correct
it.

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
features follow. `max` normalizes; absent, the values are taken as 0 to 1. The
`text` kind is the existing Stockholm track with its data supplied inline. Work:
a `columnTracks` property, a getter that merges them into `tracks`, one lookup
in `barTrackValues`, and the `hideGaps` skip that text tracks already do. A 30
kb genome alignment gives a 30k-element array, so the same 50 kb snapshot rule
as `DataModel` applies, with a `columnTracksFilehandle` for anything bigger.

### 2. Row features with their own color and glyph

`fillPalette` assigns colors by accession from a fixed palette, so an agent
cannot say "pathogenic red, benign grey". GFF3 already has a `color=` attribute
convention (JBrowse and IGV both honor it). Read it into `Annotation.color`, let
it win over the palette, and let `featureType` pick the glyph: box for a domain,
arrow for a gene, the existing exon path for `exon`. A JSON
`features: Annotation[]` field beside `data.gff` saves the agent serializing to
GFF, but GFF text stays the persisted form and the documented one.

### 3. Row strips from metadata

`treeMetadata` holds the data and nothing draws it. A strip is a named metadata
key drawn as a colored column between the tree and the alignment, with a legend.

```json
"rowStrips": [
  { "key": "clade", "colors": { "19B": "#e41a1c", "20A": "#377eb8" } },
  { "key": "host" },
  { "key": "date", "kind": "number", "range": ["2020-01-01", "2021-06-01"] }
]
```

A categorical key with no `colors` takes the ggplot palette in
`ggplotPalettes.ts`. One extra field, `tint: "clade"`, shades the row background
across tree label and alignment by that key, which is the whole of
[row-group-coloring](row-group-coloring.md) done as data instead of as a
feature. The strip canvas is a new narrow panel that scrolls with `TreeCanvas`,
so it shares the transformed container rule in `CLAUDE.md`.

### 4. Highlights with labels, in residue coordinates

`highlightColumns` is a list of column indices. An agent working from a variant
has a residue in a named row, not a column, and wants a label on it.

```json
"highlights": [
  { "row": "human", "start": 248, "end": 248, "label": "R248Q · 651/658 R" },
  { "start": 40, "end": 60, "label": "NES", "color": "rgba(0,120,255,0.25)" },
  { "rows": ["beluga", "dolphin"], "label": "frameshift carriers" }
]
```

`row` plus `start`/`end` is residue coordinates projected through
`seqPosToVisibleCol`; without `row`, they are columns, which keeps
`highlightColumns` as the degenerate case. `rows` marks rows across the tree
label and the alignment. The label draws above the span in the track strip and
in the tree gutter for rows. Draw path: the persistent-highlight branch of
`renderMSAMouseover.ts`, plus a label pass.

### 5. Letter colors from a map

`colorSchemeName` is a string chosen from the built-in table. A
`customColorScheme: Record<string, string>` at the model level, the field text
tracks already accept, lets an agent color "the residues I care about" without
adding a scheme. The raster cache keys on the scheme, so this needs the map in
the key and nothing else.

### What stays out

A per-cell color matrix. It is the general case of everything above, but it
defeats the raster tile cache's key, is quadratic in the snapshot, and every
real ask so far decomposes into a row feature, a column track, or a highlight.
Revisit if an agent produces one that does not.

## The contract

- The snapshot is the API. A layer that cannot be expressed as a snapshot field
  is not a layer. The standalone app writes the snapshot to `?data=`, the plugin
  takes the same fields through a session spec and through `run_javascript` on
  the live `MsaView` model, and the CLI should take a whole snapshot for
  `export-svg` instead of only `msa`, `tree`, and `gff`.
- Row-residue coordinates wherever a row is named, 1-based inclusive as GFF is.
  The viewer owns the gap structure, so it owns the projection.
- Large documents follow the `DataModel` rule: inline under 50 kb, otherwise a
  filehandle sibling.
- Every layer exports. The SVG tests in `packages/lib/src/render*.test.tsx` are
  where each layer proves it.
- One page, written for an agent, listing the fields with one example each. The
  JBrowse `docs` tool serves its reference from inside the app; the equivalent
  here is a markdown page in the package that an MCP host can bundle and that
  `llms.txt` on the website points at.

## Order

1. Column tracks from values. Smallest change, largest unlock, and the case the
   JBrowse recipe already demonstrates on the genome side.
2. Highlights in residue coordinates with labels. Turns a computed answer into a
   link that points at it.
3. GFF `color`, then JSON features.
4. Row strips and tint.
5. `export-svg` from a snapshot, so the agent loop closes.
6. Letter color map.

## What it changes in the backlog

- [row-group-coloring](row-group-coloring.md) becomes the `tint` field of
  layer 3.
- [find-and-search](find-and-search.md) and
  [codon-aware-dna-view](codon-aware-dna-view.md) are things an agent computes
  and pushes as highlights and a text track. They stop being viewer features.
- [selection-model](selection-model.md) stays. It is the human-to-agent
  direction: the person points, the snapshot carries what they pointed at, the
  agent reads it back.
- [neighbor-joining-scaling](neighbor-joining-scaling.md) loses urgency. A tree
  is an input.
