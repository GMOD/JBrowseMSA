---
id: msaview
title: MsaView
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/react-msaview/blob/main/packages/lib/src/model.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this
  model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Example usage

```js
import { MSAModelF } from 'react-msaview'
import { types } from '@jbrowse/mobx-state-tree'

const RootModel = types.model({ view: types.optional(MSAModelF(), {}) })
const root = RootModel.create({})
root.view.setData({ msa: '>seq1\nACGT\n>seq2\nACGT' })
```

## Overview

The main MSAView state model. Holds the loaded alignment, tree, and optional
overlay annotations, plus all display state (color scheme, zoom, scroll,
collapsed clades). It composes in members from `DialogQueueSessionMixin`,
`Tree`, and `MSAModel` (see Inherited members below). Data is loaded reactively
from the `msaFilehandle` / `treeFilehandle` / `gffFilehandle` properties, or set
directly with `setData`. Most state is persisted into the shareable URL.

## Inherited members

Available on this model via composition. Follow each link for full signatures
and docs.

### Available via [DialogQueueSessionMixin](../dialogqueuesessionmixin)

**Getters:** DialogComponent, DialogProps

**Actions:** removeActiveDialog, queueDialog

### Available via [Tree](../tree)

**Properties:** drawLabels, labelsAlignRight, treeAreaWidth, treeWidth,
showBranchLen, drawTree, drawNodeBubbles, drawNodeLabels, showTreeOverview,
overviewHeight, autoTreeAreaWidth

**Actions:** setTreeAreaWidth, setTreeWidth, setLabelsAlignRight, setDrawTree,
setAutoTreeAreaWidth, setShowBranchLen, setDrawNodeBubbles, setDrawNodeLabels,
setShowTreeOverview, setOverviewHeight, setDrawLabels

### Available via [MSAModel](../msamodel)

**Properties:** bgColor, colorSchemeName, showColumnStats, msaFormat

**Actions:** setColorSchemeName, setBgColor, setShowColumnStats, setMSAFormat

### MsaView - Properties

#### property: allowedGappyness

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
allowedGappyness: stripDefault(types.number, defaultAllowedGappyness)
```

#### property: clades

clades of the tree with a mark drawn over them. `mrca` names tips whose common
ancestor is the clade, or `range` its first and last tip in display order, and
`tips` is the leaf count the producer measured. See docs/layers.md

```js
// type signature
IOptionalIType<IArrayType<IType<Clade, Clade, Clade>>, [undefined]>
// code
clades: stripDefault(types.array(types.frozen<Clade>()), [])
```

#### property: collapsed

array of tree parent nodes that are 'collapsed' (all children are hidden)

```js
// type signature
IOptionalIType<IArrayType<ISimpleType<string>>, [undefined]>
// code
collapsed: stripDefault(types.array(types.string), [])
```

#### property: columnTracks

tracks supplied as data: per-column values drawn as bars, or a per-column string
drawn as a text track. See docs/layers.md

```js
// type signature
IOptionalIType<IArrayType<IType<ColumnTrackSpec, ColumnTrackSpec, ColumnTrackSpec>>, [undefined]>
// code
columnTracks: stripDefault(
          types.array(types.frozen<ColumnTrackSpec>()),
          [],
        )
```

#### property: colWidth

width of columns, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
colWidth: stripDefault(types.number, defaultColWidth)
```

#### property: currentAlignment

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
currentAlignment: stripDefault(types.number, defaultCurrentAlignment)
```

#### property: data

data from the loaded tree/msa/treeMetadata, generally loaded by autorun

```js
// type signature
IOptionalIType<IModelType<{ tree: IMaybe<ISimpleType<string>>; msa: IMaybe<ISimpleType<string>>; treeMetadata: IMaybe<ISimpleType<string>>; gff: IMaybe<...>; }, { ...; }, _NotCustomized, { ...; }>, [...]>
// code
data: types.optional(DataModelF(), {
          tree: '',
          msa: '',
          treeMetadata: '',
        })
```

#### property: drawMsaLetters

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
drawMsaLetters: stripDefault(types.boolean, defaultDrawMsaLetters)
```

#### property: encodings

what the viewer's own marks read from `rowData`: `{channel, field, scale?}` per
channel, where `channel` is `tipLabel` or `rowTint`. See docs/layers.md

```js
// type signature
IOptionalIType<IArrayType<IType<Encoding, Encoding, Encoding>>, [undefined]>
// code
encodings: stripDefault(types.array(types.frozen<Encoding>()), [])
```

#### property: gffFilehandle

filehandle object for a GFF file of overlay annotations

```js
// type signature
IMaybe<any>
// code
gffFilehandle: types.maybe(FileLocation)
```

#### property: height

height of the div containing the view, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
height: stripDefault(types.number, defaultHeight)
```

#### property: hideGaps

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
hideGaps: stripDefault(types.boolean, defaultHideGaps)
```

#### property: highlightColumns

declarative seed for the highlighted-columns overlay (visible column indices).
Unlike the volatile `highlightedColumns` (driven by transient genome-hover
sync), this persists in the snapshot/URL so a shared link can open with specific
columns highlighted. Applied once in afterCreate.

```js
// type signature
IType<number[], number[], number[]>
// code
highlightColumns: types.frozen<number[] | undefined>()
```

#### property: highlights

labeled highlights in 1-based inclusive coordinates: a column span
`{start, end}`, a residue span `{row, start, end}` of a named row, or a row set
`{rows}`, each with an optional `label` and `color`. Persists in the snapshot
and the URL.

```js
// type signature
IOptionalIType<IArrayType<IType<Highlight, Highlight, Highlight>>, [undefined]>
// code
highlights: stripDefault(types.array(types.frozen<Highlight>()), [])
```

#### property: id

id of view, randomly generated if not provided

```js
// type signature
any
// code
id: ElementId
```

#### property: msaFilehandle

filehandle object for the MSA (which could contain a tree e.g. with stockholm
files)

```js
// type signature
IMaybe<any>
// code
msaFilehandle: types.maybe(FileLocation)
```

#### property: relativeTo

```js
// type signature
IMaybe<ISimpleType<string>>
// code
relativeTo: types.maybe(types.string)
```

#### property: residueMappings

row-to-structure residue correspondence, computed outside the viewer (e.g. from
SIFTS). Matching by sequence equality places a tagged construct, a truncation or
a subsequence row on the wrong residue. See docs/layers.md

```js
// type signature
IOptionalIType<IArrayType<IType<ResidueMapping, ResidueMapping, ResidueMapping>>, [undefined]>
// code
residueMappings: stripDefault(
          types.array(types.frozen<ResidueMapping>()),
          [],
        )
```

#### property: rowHeight

height of each row, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
rowHeight: stripDefault(types.number, defaultRowHeight)
```

#### property: rowPanels

panels drawn between the tree and the alignment, one cell per row:
`{kind: "strip", field, scale?, width?, header?}` colors each row from a
`rowData` field. See docs/layers.md

```js
// type signature
IOptionalIType<IArrayType<IType<RowPanelSpec, RowPanelSpec, RowPanelSpec>>, [undefined]>
// code
rowPanels: stripDefault(types.array(types.frozen<RowPanelSpec>()), [])
```

#### property: scrollX

scroll position, X-offset, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
scrollX: stripDefault(types.number, defaultScrollX)
```

#### property: scrollY

scroll position, Y-offset, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
scrollY: stripDefault(types.number, defaultScrollY)
```

#### property: scrollZoom

zoom in/out on plain mouse-wheel without holding ctrl

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
scrollZoom: stripDefault(types.boolean, defaultScrollZoom)
```

#### property: scrollZoomAxis

which cell dimensions a wheel zoom scales, while `scrollZoom` is on

```js
// type signature
IOptionalIType<ISimpleType<"both" | "horizontal" | "vertical">, [undefined]>
// code
scrollZoomAxis: stripDefault(
          types.enumeration('ScrollZoomAxis', [...scrollZoomAxes]),
          defaultScrollZoomAxis,
        )
```

#### property: showDomainLegend

whether the domain legend is expanded. The legend floats over the top-right of
the alignment and covers residues, so a session or figure can open with it
collapsed.

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
showDomainLegend: stripDefault(types.boolean, defaultShowDomainLegend)
```

#### property: showDomains

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
showDomains: stripDefault(types.boolean, defaultShowDomains)
```

#### property: showOnly

focus on particular subtree

```js
// type signature
IMaybe<ISimpleType<string>>
// code
showOnly: types.maybe(types.string)
```

#### property: subFeatureRows

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
subFeatureRows: stripDefault(types.boolean, defaultSubFeatureRows)
```

#### property: trackHeights

the height of every track one divider resizes, keyed by `heightKey`: the `kind`
for the computed tracks, `own:<id>` for a data track. A key is absent until the
user drags that divider, and `defaultTrackHeights` answers for it until then, so
an untouched viewer adds nothing to the shared URL.

```js
// type signature
IOptionalIType<IMapType<ISimpleType<number>>, [undefined]>
// code
trackHeights: stripDefault(types.map(types.number), {})
```

#### property: treeFilehandle

filehandle object for the tree

```js
// type signature
IMaybe<any>
// code
treeFilehandle: types.maybe(FileLocation)
```

#### property: treeMetadataFilehandle

filehandle object for tree metadata

```js
// type signature
IMaybe<any>
// code
treeMetadataFilehandle: types.maybe(FileLocation)
```

#### property: turnedOffFeatures

the user's explicit hide choices per annotation accession, keyed by accession
with the value meaning "off", like `turnedOffTracks`. An untouched accession is
absent and drawn, so the shared URL grows only with the user's filters

```js
// type signature
IOptionalIType<IMapType<ISimpleType<boolean>>, [undefined]>
// code
turnedOffFeatures: stripDefault(types.map(types.boolean), {})
```

#### property: turnedOffTracks

the user's explicit show/hide choice per track id, keyed by id with the value
meaning "off". A track the user has never touched is absent and falls back to
its own default (see `defaultOffTracks`), so a hidden-by-default track adds
nothing to the shared URL.

```js
// type signature
IOptionalIType<IMapType<ISimpleType<boolean>>, [undefined]>
// code
turnedOffTracks: stripDefault(types.map(types.boolean), {})
```

#### property: type

hardcoded view type

```js
// type signature
ILiteralType<"MsaView">
// code
type: types.literal('MsaView')
```

### MsaView - Volatiles

#### volatile: annotations

overlay annotations drawn on the alignment. InterProScan JSON, GFF and user
uploads all convert to this flat list

```js
// type signature
Annotation[]
// code
annotations: [] as Annotation[]
```

#### volatile: blockSize

size of blocks of content to be drawn, px

```js
// type signature
number
// code
blockSize: 500
```

#### volatile: error

```js
// type signature
unknown
// code
error: undefined as unknown
```

#### volatile: headerHeight

```js
// type signature
number
// code
headerHeight: 0
```

#### volatile: hideHeader

leaves the toolbar out, for a host drawing its own controls. Kept out of the
snapshot so a link opened in the full app shows the toolbar.

```js
// type signature
false
// code
hideHeader: false
```

#### volatile: highlightedColumns

array of column indices to highlight

```js
// type signature
number[]
// code
highlightedColumns: undefined as number[] | undefined
```

#### volatile: highResScaleFactor

canvas scale factor, from the device pixel ratio

```js
// type signature
number
// code
highResScaleFactor: typeof window === 'undefined' ? 1 : window.devicePixelRatio
```

#### volatile: hostCarriesData

set by a host that restores the loaded documents itself, such as a jbrowse
session or a page that refetches them. `unshareableData` then reports nothing

```js
// type signature
false
// code
hostCarriesData: false
```

#### volatile: hoveredTreeNode

the currently hovered tree node ID and its descendant leaf names

```js
// type signature
{ nodeId: string; descendantNames: string[]; }
// code
hoveredTreeNode: undefined as
        | { nodeId: string; descendantNames: string[] }
        | undefined
```

#### volatile: loadingMSA

```js
// type signature
false
// code
loadingMSA: false
```

#### volatile: loadingTree

```js
// type signature
false
// code
loadingTree: false
```

#### volatile: marginLeft

```js
// type signature
number
// code
marginLeft: 20
```

#### volatile: minimapHeight

```js
// type signature
number
// code
minimapHeight: 56
```

#### volatile: mouseClickCol

the currently mouse-click column

```js
// type signature
number
// code
mouseClickCol: undefined as number | undefined
```

#### volatile: mouseClickRow

the currently mouse-click row

```js
// type signature
number
// code
mouseClickRow: undefined as number | undefined
```

#### volatile: mouseCol

the currently mouse-hovered column

```js
// type signature
number
// code
mouseCol: undefined as number | undefined
```

#### volatile: mouseRow

the currently mouse-hovered row

```js
// type signature
number
// code
mouseRow: undefined as number | undefined
```

#### volatile: resetCount

bumped by reset(). The error boundary above the view uses it as its key, since
the boundary keeps its caught error until remounted

```js
// type signature
number
// code
resetCount: 0
```

#### volatile: resizeHandleWidth

resize handle width between tree and msa area, px

```js
// type signature
number
// code
resizeHandleWidth: 5
```

#### volatile: status

```js
// type signature
{ msg: string; onCancel?: () => void; }
// code
status: undefined as { msg: string; onCancel?: () => void } | undefined
```

#### volatile: transientHighlights

transient highlights keyed by owner, so a structure viewer's hover and a genome
view's hover each clear only their own. Not persisted.

```js
// type signature
Record<string, Highlight[]>
// code
transientHighlights: {} as Record<string, Highlight[]>
```

#### volatile: volatileWidth

```js
// type signature
number
// code
volatileWidth: undefined as number | undefined
```

#### volatile: warnings

non-fatal load problems: an optional layer that failed to load, an overlay that
failed to parse. `error` replaces the view and is for the alignment itself

```js
// type signature
string[]
// code
warnings: [] as string[]
```

### MsaView - Getters

#### getter: actuallyShowDomains

```js
// type
boolean
```

#### getter: adapterTrackModels

```js
// type
BasicTrack[]
```

#### getter: alignmentNames

```js
// type
any
```

#### getter: allBranchesLength0

```js
// type
boolean
```

#### getter: alphabetMaxBits

The information content of a fully conserved column, in bits, which depends on
the alphabet. Both the entropy ceiling `conservation` normalizes against and the
y-axis ceiling of the sequence logo track.

```js
// type
number
```

#### getter: basePairTrackModels

the consensus secondary structure as a track, when there is one. A separate
getter keeps the object stable across zoom, so its canvas does not redraw

```js
// type
BasicTrack[]
```

#### getter: blanks

```js
// type
any[]
```

#### getter: blocks2d

```js
// type
(readonly [any, any])[]
```

#### getter: blocksX

```js
// type
any[]
```

#### getter: blocksY

```js
// type
any[]
```

#### getter: branchColors

the color the `branch` channel gives each tree edge, by the node id at the
edge's far end, or undefined when no encoding names the channel. A node takes
the field value its tips agree on, so a clade of one value colors down from
where it splits off, and a node whose tips disagree or whose value has no color
is absent and draws in the default color.

The pass runs over the whole tree, never `root`, so a collapsed or focused clade
keeps the color the full tree gives it.

```js
// type
Map<string, string>
```

#### getter: categoricalDomainTypes

categorical feature types (InterPro domains and the like) that each get their
own color and a legend entry

```js
// type
any[]
```

#### getter: cladeGutterWidth

the pixel column reserved at the right of the tree area for the bracket mark,
which the tip labels and the tree itself stay clear of. Zero where no clade
draws a bar or a label.

```js
// type
number
```

#### getter: clickedCell

the cell a click pinned. Public API: MSAViewer's onCellClick reports it.

```js
// type
any
```

#### getter: colClustalX

Pre-computed ClustalX colors per column. Returns a map of letter -> color for
each column. ref http://www.jalview.org/help/html/colourSchemes/clustal.html

```js
// type
;(Record < string, string > [])
```

#### getter: colConsensus

Pre-computed consensus letter and percent identity color per column. Used by
percent_identity_dynamic color scheme.

```js
// type
{
  letter: string
  color: string
}
;[]
```

#### getter: colorScheme

```js
// type
Record<string, string>
```

#### getter: colStats

```js
// type
ColumnCounts
```

#### getter: columns

```js
// type
Map<unknown, unknown>
```

#### getter: columns2d

```js
// type
any
```

#### getter: columnTrackContent

a data track's values or string, projected from its row's residues onto
alignment columns when it names a row

```js
// type
Map<string, { values?: number[]; data?: string; arcs?: Arc[]; }>
```

#### getter: columnTrackModels

```js
// type
BasicTrack[]
```

#### getter: computedTrackModels

the tracks computed from the alignment; they depend on their heights and the
alphabet, not on zoom

```js
// type
BasicTrack[]
```

#### getter: conservation

Conservation score per column using Shannon entropy (biojs-msa style).
Conservation = (1 - H/Hmax) * (1 - gapFraction) Returns values 0-1 where 1 =
fully conserved, 0 = no conservation.

```js
// type
number[]
```

#### getter: dataInitialized

```js
// type
boolean
```

#### getter: domainBands

every filtered-on annotation resolved to the visible column span it is drawn
across, keyed by row name. Each row is ordered longest-first so a nested short
domain draws on top, and each band carries the lane the sub-row layout puts it
in. Resolved once here instead of per canvas block per redraw; the letter
renderer also reads the band colors to pick legible letter colors.

```js
// type
Map<string, DomainBand[]>
```

#### getter: domainBandsByStart

the same bands ordered by start column, for left-to-right sweeps (the letter
renderer walks columns and needs the band covering each one)

```js
// type
Map<any, any>
```

#### getter: domainUnderline

whether the overlay marks each domain with a bar under its row instead of
filling the row behind the letters. Letter-color mode hands the background to
the color scheme, so a filled box would paint over it and leave the setting with
nothing to show. Sub-row layout already stacks the boxes clear of the letters,
and with the letters too small to draw the filled box is the only thing left to
read.

```js
// type
boolean
```

#### getter: featureColors

the fill and outline of every feature's span: its own GFF `color=` first, then
the `featureFill` scale, then the accession palette. Computed once per change of
the features, the encodings or the palette

```js
// type
Map<Annotation, { fill: string; stroke: string; }>
```

#### getter: featureFillEncoding

the encoding coloring the overlay's spans, undefined when none does, which
leaves each span the color its accession takes in `fillPalette`

```js
// type
ResolvedEncoding
```

#### getter: featureLabels

the text the `featureLabel` channel draws inside each span, undefined when no
encoding names the channel. A data channel, so it draws whether or not the
residue letters do

```js
// type
Map<Annotation, string>
```

#### getter: fontSize

```js
// type
number
```

#### getter: header

```js
// type
any
```

#### getter: hideGapsEffective

hideGaps takes effect when there are collapsed rows or allowedGappyness < 100

```js
// type
boolean
```

#### getter: hierarchy

generates a new tree that is clustered with x,y positions

```js
// type
HierarchyNode<NodeWithIdsAndLength>
```

#### getter: highlightedColumnRuns

contiguous runs of `highlightedColumns`, so a run of highlighted columns draws
as one bordered band. Memoized because the overlay canvas redraws on every mouse
move.

```js
// type
{
  start: number
  end: number
}
;[]
```

#### getter: hostRestoresData

whether the host restores the loaded documents outside the snapshot. When true,
`unshareableData` is empty.

A simple host sets `hostCarriesData`. A host where this depends on how the view
was opened overrides the getter in its own composed model's `.views` block;
jbrowse-plugin-msaview's indexed-location views refetch from a URL the session
holds, while its data-store views do not. `unshareableData` reads it off `self`,
so an override takes effect.

```js
// type
boolean
```

#### getter: hoveredCell

the cell under the pointer. Public API: MSAViewer's onCellHover reports it.

```js
// type
any
```

#### getter: hoveredInsertion

Returns insertion info if mouse is hovering over an insertion indicator

```js
// type
{
  rowName: any
  col: number
  letters: any
}
```

#### getter: hoveredRowIndices

row indices highlighted by the current tree hover (a hovered internal node
highlights every tip below it). Shared by the tree and MSA overlay canvases, via
the memoized name->index map.

```js
// type
unknown[]
```

#### getter: insertionPositions

Returns a map of row name to array of insertions with display position and
letters

```js
// type
Map<string, { pos: number; letters: string; }[]>
```

#### getter: isLoading

```js
// type
boolean
```

#### getter: labelWidthMap

```js
// type
Map<any, number>
```

#### getter: labelWidthScale

factor turning a labelWidthMap entry into its width at the current font size

```js
// type
number
```

#### getter: leaves

```js
// type
any[]
```

#### getter: legends

the categorical color keys drawn for this view, shared by the on-screen legend
overlay and the SVG export's reserved column. The domain overlay produces the
first, listing the `featureFill` scale where an encoding names one. Every field
a row-table encoding or a row panel reads produces one more, so two channels
over one field, or two strips over it, list that field once

```js
// type
Legend[]
```

#### getter: mappedStructures

the structures with usable mappings. A row can map onto several, such as an
experimental entry and a predicted model.

```js
// type
any
```

#### getter: maxBranchLength

x-position of the farthest tip in a phylogram, px: treeWidth, or 0 for a tree
with no branch lengths (drawn as a cladogram)

```js
// type
number
```

#### getter: maxDepthToLeaf

max topological depth to a tip, used to scale cladogram x-positions

```js
// type
number
```

#### getter: maxScrollX

```js
// type
number
```

#### getter: maxScrollY

most-negative allowed scrollY, which keeps the last row in view

```js
// type
number
```

#### getter: mouseOverColumnStats

`columnStatsAt` for the hovered column, undefined when nothing is hovered

```js
// type
ColumnStats
```

#### getter: mouseOverDomains

domain annotations under the mouse, hit-tested against the exact visible column
span each box is drawn at (so it matches the overlay across gaps)

```js
// type
Annotation[]
```

#### getter: mouseOverRowName

```js
// type
any
```

#### getter: MSA

```js
// type
MSAParserType
```

#### getter: msaAreaHeight

the vertical space for alignment rows: the widget height less the header, the
tracks, and the minimap when columns overflow. Shared by blocksY, maxScrollY,
the vertical scrollbar and fitVertically.

```js
// type
number
```

#### getter: msaAreaWidth

widget width minus the tree area and the row panels gives the space for the MSA

```js
// type
number
```

#### getter: msaCanvasWidth

width of the alignment canvas: the msa area less the vertical scrollbar.
showHorizontalScrollbar must not read it, since that feeds msaAreaHeight ->
showVerticalScrollbar and would form a cycle

```js
// type
number
```

#### getter: noTree

```js
// type
boolean
```

#### getter: numColumns

```js
// type
number
```

#### getter: numRows

number of rows on screen: the leaf count, which includes tree leaves with no
matching MSA row (drawn blank), unlike `rows.length`.

```js
// type
any
```

#### getter: propertyConservation

Per-column conservation of physicochemical property class (amino acids only).
Surfaces conservative-substitution sites that identity-based conservation
misses. Empty for nucleotide alignments.

```js
// type
number[]
```

#### getter: pxPerBranchLength

pixels per unit of branch length in the phylogram layout, 0 in cladogram mode.
The tree's scale bar uses it.

```js
// type
number
```

#### getter: realAllowedGappyness

```js
// type
number
```

#### getter: referenceRowIndex

row index of the reference row (`relativeTo`), undefined when unset

```js
// type
unknown
```

#### getter: residueMappingProblems

why each ignored residue mapping is ignored, so a host can tell a missing
structure from a mapping made against a different alignment.

```js
// type
ResidueMappingProblem[]
```

#### getter: resolvedClades

`clades` resolved to the rows each one covers. The tip names resolve against
`tree` rather than `root`, so a clade whose ancestor the user collapsed keeps
its rows. One leaf pass over the tree serves every clade. A `range` record names
no node, so `collapse` and `focus`, which need one, drop it.

```js
// type
ResolvedClade[]
```

#### getter: resolvedEncodings

each encoding with its scale resolved against the values its field takes: a
feature channel reads them across the features drawn, every other channel across
the row table. Resolved once per change of that table or the encodings, never
per row per frame.

```js
// type
ResolvedEncoding[]
```

#### getter: resolvedHighlights

`highlights` projected onto what is on screen: residue spans go through the
named row's gap structure, column spans through the hidden-column list, and a
span that lands entirely on hidden columns is dropped. Row names that match no
row are ignored.

```js
// type
ResolvedHighlight[]
```

#### getter: resolvedRowPanels

each row panel with its scale resolved against the values its field takes across
the row table, giving the color per row name, the pixel column it draws in, and
the entries its legend lists. Resolved once per change of that table or the
panels, never per block per frame.

```js
// type
ResolvedRowPanel[]
```

#### getter: root

```js
// type
HierarchyNode<NodeWithIds>
```

#### getter: rootToTipLength

branch-length extent of the displayed tree, root to farthest tip, in the tree's
own units

```js
// type
number
```

#### getter: rowData

the row table: extra fields per row, keyed by row name, which the `encodings`
channels read. It is stored as the JSON string `data.treeMetadata`, the name
that travels in existing links, so the inline size limit and
`treeMetadataFilehandle` cover it. labelWidthMap reads it on every layout, so a
malformed user-supplied file returns {} instead of throwing out of rendering.

```js
// type
Record<string, Record<string, string>>
```

#### getter: rowFields

the field names the row table carries, sorted, for a producer or a UI choosing
one to encode

```js
// type
string[]
```

#### getter: rowMap

every sequence in the alignment, keyed by row name, including rows a collapsed
clade hides. `rows` holds only the rows on screen; lookups by row name use this

```js
// type
Map<unknown, unknown>
```

#### getter: rowNames

Returns the list of row (sequence) names in display order. Part of the public
API used by downstream consumers (e.g. jbrowse plugins).

```js
// type
string[]
```

#### getter: rowNamesSet

```js
// type
Map<unknown, unknown>
```

#### getter: rowPanelsHeaderHeight

height of the band the row panel headers draw in, which is zero with no row
panels and leaves the top area as it was

```js
// type
0 | 56
```

#### getter: rowPanelsWidth

the pixel column the row panels occupy between the tree and the alignment, the
sum of each record's width

```js
// type
any
```

#### getter: rows

```js
// type
any
```

#### getter: rowTints

the wash the `rowTint` channel draws over each row, indexed by row, or undefined
when no encoding names the channel. The overlay draws these, so a tint stays out
of the raster tile cache and its keys.

```js
// type
string[]
```

#### getter: secondaryStructureArcs

the base pairs of the consensus secondary structure, as arcs, in visible column
space (hidden columns are removed before parsing)

```js
// type
Arc[]
```

#### getter: secondaryStructureConsensus

```js
// type
string
```

#### getter: segmentDomainTypes

ordinal segment types (exons etc.), ordered by sequence position so
exon-1..exon-14 run left-to-right; colored by alternating shade and labeled by
number, with no legend row

```js
// type
any
```

#### getter: segmentLabels

accession -> number drawn on each segment band: the trailing number of the
feature name ("exon-3" -> "3"), else its 1-based position

```js
// type
Map<unknown, unknown>
```

#### getter: seqConsensus

```js
// type
string
```

#### getter: sequenceType

Detects sequence type based on letters present in the alignment. Returns 'dna',
'rna', or 'amino'.

```js
// type
;'dna' | 'rna' | 'amino'
```

#### getter: showBranchLenEffective

effective showBranchLen accounting for allBranchesLength0

```js
// type
boolean
```

#### getter: showHorizontalScrollbar

```js
// type
boolean
```

#### getter: showMsaLetters

```js
// type
boolean
```

#### getter: showTreeText

```js
// type
boolean
```

#### getter: showVerticalScrollbar

```js
// type
boolean
```

#### getter: tipLabelColors

the color the `tipLabel` channel gives each row, by row name. Undefined when no
encoding names the channel, which leaves the labels the theme's text color.

```js
// type
Map<string, string>
```

#### getter: totalHeight

```js
// type
number
```

#### getter: totalTrackAreaHeight

total height of track area (px)

```js
// type
any
```

#### getter: totalWidth

```js
// type
number
```

#### getter: tree

```js
// type
NodeWithIds
```

#### getter: treeAreaWidthMinusMargin

the right edge the tip labels end at, which is the tree area less the margin and
the bracket gutter

```js
// type
number
```

#### getter: treeOverviewClades

the `clades` highlights in the overview's own row space, which the focus does
not narrow

```js
// type
ResolvedClade[]
```

#### getter: treeOverviewFocusRows

the inclusive tip rows the focused subtree covers in the overview, which is the
box drawn on it. undefined with no focus

```js
// type
;[number, number]
```

#### getter: treeOverviewHeight

height of the band the tree overview draws in, zero when it is off

```js
// type
number
```

#### getter: treeOverviewLayout

the whole tree laid out for the overview, or undefined when the overview is off.
The focus is left out, so the focused subtree draws inside the whole tree, and
the collapsed clades are folded, since those are rows the view no longer has.
`x` is in tip-index space and `len` is a fraction of the root-to-tip length, so
one layout serves any band size.

```js
// type
{ root: HierarchyNode<NodeWithIds>; numTips: number; maxDepthToLeaf: number; showBranchLen: boolean; }
```

#### getter: turnedOnTracks

```js
// type
any
```

#### getter: unshareableData

loaded documents left out of the snapshot, largest first. A file opened from
disk or pasted in becomes inline text, and DataModel drops an inline document
past `maxInlineSnapshotBytes`.

The header lists these, and the standalone app stops rewriting the address bar
while the list is non-empty, so a copied link does not open an empty viewer
unannounced. A document fetched from a URL never appears here, since the
snapshot keeps its filehandle.

Empty when `hostRestoresData` is true.

```js
// type
UnshareableData[]
```

#### getter: usableResidueMappings

the mappings that fit the loaded alignment. A row-level problem drops the whole
mapping; a malformed segment drops only that segment.

```js
// type
ResidueMapping[]
```

#### getter: verticalScrollbarWidth

```js
// type
0 | 20
```

#### getter: viewport

the columns on screen. Public API: MSAViewer's onViewportChange reports it.

```js
// type
Viewport
```

#### getter: visibleDomainTypes

the domain types currently drawn on the alignment (filtered-on), shared by the
on-screen legend and the SVG export legend: the categorical types ordered by
sequence position. Ordinal segments (exons) are numbered on the band instead

```js
// type
any
```

#### getter: wheelZoomAxis

axis a wheel zoom scales, for ctrl+wheel as much as for scroll-zoom. With
scroll-zoom off the toolbar shows no axis, so ctrl+wheel takes both.

```js
// type
;'both' | 'horizontal' | 'vertical'
```

#### getter: width

```js
// type
number
```

### MsaView - Methods

#### method: cellAt

the cell at a visible column and row index, in the coordinates a host writes
highlights in

```js
// type signature
cellAt: (visibleCol: number, rowIndex?: number) => Cell
```

#### method: columnStatsAt

per-column summary statistics: consensus residue and its identity fraction, both
conservation scores, gap fraction, and the sorted non-gap residue distribution.
undefined past the end of the alignment or for an all-gap column.

```js
// type signature
columnStatsAt: (col: number) => ColumnStats
```

#### method: getRowData

```js
// type signature
getRowData: (name: string) => { data: { name?: string; accession?: string; dbxref?: string; }; rowData: any; }
```

#### method: globalColToVisibleCol

Convert a global column index to a visible column index. Returns undefined if
the column is hidden (in blanks). This is the inverse of visibleColToGlobalCol.

```js
// type signature
globalColToVisibleCol: (globalCol: number) => number
```

#### method: rowDataOf

one row's fields, the single reader of the row table

```js
// type signature
rowDataOf: (name: string) => any
```

#### method: rowResidue

The row residue for a structure residue; the inverse of `structureResidue`,
returning undefined in the same cases. `asymId` picks a chain when several
mappings share an entry id, as in a homodimer.

```js
// type signature
rowResidue: (structureId: string, position: number, asymId?: string) => RowResidue
```

#### method: seqPosIndex

index of the global column holding each ungapped sequence position of a row. The
domain overlay resolves thousands of these per redraw. Built lazily per row and
cached on the parse.

```js
// type signature
seqPosIndex: (rowName: string) => Int32Array<ArrayBufferLike>
```

#### method: seqPosToGlobalCol

Convert a sequence position (ungapped) to a global column index. Returns
undefined for a row name the alignment does not have.

```js
// type signature
seqPosToGlobalCol: (rowName: string, seqPos: number) => any
```

#### method: seqPosToVisibleCol

Convert a sequence position (ungapped) directly to a visible column index. This
combines seqPosToGlobalCol and globalColToVisibleCol.

```js
// type signature
seqPosToVisibleCol: (rowName: string, seqPos: number) => any
```

#### method: structureResidue

The structure residue for a row residue. Returns undefined when no segment
covers `seqPos`, or when the row maps onto several structures and `structureId`
does not pick one (see `mappedStructures`).

Positions are 1-based, like `residueMappings` and `highlights`; the column
helpers above are 0-based.

```js
// type signature
structureResidue: (rowName: string, seqPos: number, structureId?: string) => StructureResidue
```

#### method: trackHeight

the height a track draws at: what the user dragged its divider to, then the
height its snapshot asked for, then its kind's default. Only a text track falls
through to rowHeight, and `??` short-circuits before reading it, so vertical
zoom does not rebuild the other tracks

```js
// type signature
trackHeight: (kind: TrackKind, heightKey?: string, given?: number) => number
```

#### method: treeOverviewHit

the subtree a point `y` pixels down the tree overview picks: the deepest one
whose tip range covers every row under that pixel, with the rows it covers. A
pixel stands for several tips on a large tree, which is what keeps the pick off
the individual tips. undefined when the overview is off or the point picks the
whole tree.

```js
// type signature
treeOverviewHit: (y: number) => { id: any; rows: [number, number]; }
```

#### method: visibleColToGlobalCol

Convert a visible column index (what a mouse handler reports) to a column of the
full alignment. A host indexing its own per-column data needs this when columns
are hidden.

```js
// type signature
visibleColToGlobalCol: (visibleCol: number) => number
```

#### method: visibleColToRowLetter

Return a row-specific letter at a visible column, or undefined if gap.

```js
// type signature
visibleColToRowLetter: (rowName: string, visibleCol: number) => any
```

#### method: visibleColToSeqPos

Convert a visible column to a row-specific sequence position (0-based). Returns
undefined if the position is a gap in the sequence.

Public API, like the sibling converters (visibleColToGlobalCol,
seqPosToVisibleCol, globalColToVisibleCol, seqPosToGlobalCol) hosts use to
translate between columns and residue positions. Keep them stable.

```js
// type signature
visibleColToSeqPos: (rowName: string, visibleCol: number) => number
```

#### method: visibleColToSeqPosOneBased

Convert a visible column to a row-specific sequence position (1-based). Returns
undefined if the position is a gap in the sequence.

```js
// type signature
visibleColToSeqPosOneBased: (rowName: string, visibleCol: number) => any
```

#### method: visibleSpan

the visible columns a span covers, in highlight coordinates: `start` and `end`
are 1-based residues of `row`, or columns of the file without it. A fractional
position, as a zoom gesture reports one, widens to the whole residue or column
it falls in. A span entirely on hidden columns, or naming a row the alignment
lacks, gives undefined.

```js
// type signature
visibleSpan: ({ row, start: rawStart, end: rawEnd }: Region) => { startCol: any; endCol: any; }
```

### MsaView - Actions

#### action: addWarning

record a non-fatal load problem: a layer that failed to load, a file that failed
to parse

```js
// type signature
addWarning: (warning: string) => void
```

#### action: applyHighlight

show `highlights` for `owner`, replacing that owner's previous ones and leaving
other owners' in place

```js
// type signature
applyHighlight: (owner: string, highlights: Highlight[]) => void
```

#### action: calculateNeighborJoiningTreeFromMSA

Calculate a neighbor joining tree from the current MSA using BLOSUM62 distances.
Throws above `maxNeighborJoiningRows`: the join loop is cubic and runs on the
main thread, and 800 rows freeze the tab for ten seconds with no cancel.

```js
// type signature
calculateNeighborJoiningTreeFromMSA: () => void
```

#### action: clearHighlight

remove `owner`'s highlights, leaving other owners' in place

```js
// type signature
clearHighlight: (owner: string) => void
```

#### action: clearWarnings

```js
// type signature
clearWarnings: () => void
```

#### action: doScrollX

```js
// type signature
doScrollX: (deltaX: number) => void
```

#### action: doScrollY

```js
// type signature
doScrollY: (deltaY: number) => void
```

#### action: drawRelativeTo

draw the alignment with positions numbered relative to the given row's sequence
(its node id), instead of in raw MSA-column coordinates

```js
// type signature
drawRelativeTo: (id: string) => void
```

#### action: exportSVG

```js
// type signature
exportSVG: (opts: ExportSvgOptions) => Promise<void>
```

#### action: fit

```js
// type signature
fit: () => void
```

#### action: fitHorizontally

```js
// type signature
fitHorizontally: () => void
```

#### action: fitVertically

```js
// type signature
fitVertically: () => void
```

#### action: replaceTree

swap in a different tree over the same alignment. Clears `collapsed` and
`showOnly`, since path-derived node ids (node-0-0-1) from the old tree would
match unrelated nodes in the new one.

```js
// type signature
replaceTree: (newick: string) => void
```

#### action: reset

Return to the import form: reset every property not in `preservedOnReset` to its
default, then clear the file-derived volatiles applySnapshot does not touch.

```js
// type signature
reset: () => void
```

#### action: resetZoom

restore the default column width and row height

```js
// type signature
resetZoom: () => void
```

#### action: setAllowedGappyness

```js
// type signature
setAllowedGappyness: (arg: number) => void
```

#### action: setAnnotations

Set the overlay annotations (an empty list clears them). InterProScan, GFF, user
uploads and NCBI CDD all arrive here as Annotation[].

Leaves `showDomains` alone, because a restored snapshot reloads its GFF and must
keep a hidden overlay hidden.

```js
// type signature
setAnnotations: (annotations: Annotation[]) => void
```

#### action: setClades

replace the clades the viewer marks (see docs/layers.md)

```js
// type signature
setClades: (clades: Clade[]) => void
```

#### action: setColumnTracks

```js
// type signature
setColumnTracks: (tracks: ColumnTrackSpec[]) => void
```

#### action: setColWidth

set col width (px)

```js
// type signature
setColWidth: (n: number) => void
```

#### action: setCurrentAlignment

switch to another alignment of a multi-alignment file (Stockholm). Clears the
collapsed node ids, the subtree in focus, the reference row and the scroll
position, which all refer to the previous alignment

```js
// type signature
setCurrentAlignment: (n: number) => void
```

#### action: setData

set the alignment/tree/metadata/domain data directly from strings, bypassing the
filehandle loaders

```js
// type signature
setData: (data: { msa?: string; tree?: string; treeMetadata?: string; gff?: string; }) => void
```

#### action: setDomains

set the overlay from raw InterProScan results keyed by row name. Kept for
downstream plugins that hold the EBI wire format; new code should adapt to
Annotation[] and call setAnnotations.

```js
// type signature
setDomains: (data?: Record<string, InterProScanResults>) => void
```

#### action: setDrawMsaLetters

```js
// type signature
setDrawMsaLetters: (arg: boolean) => void
```

#### action: setEncodings

replace what the viewer's marks read from the row table

```js
// type signature
setEncodings: (encodings: Encoding[]) => void
```

#### action: setError

set error state

```js
// type signature
setError: (error?: unknown) => void
```

#### action: setFilter

show or hide an annotation type. Only hidden types are recorded; see
`turnedOffFeatures`

```js
// type signature
setFilter: (accession: string, shown: boolean) => void
```

#### action: setGFF

store the GFF text in the snapshot like the alignment and tree. The parsed
annotations are volatile and a blob filehandle is cleared once read, so the text
is the only persisted copy. An autorun parses it into annotations.

```js
// type signature
setGFF: (result: string) => void
```

#### action: setGFFFilehandle

```js
// type signature
setGFFFilehandle: (gffFilehandle?: FileLocationType) => void
```

#### action: setHeaderHeight

```js
// type signature
setHeaderHeight: (arg: number) => void
```

#### action: setHeight

set the height of the view in px

```js
// type signature
setHeight: (height: number) => void
```

#### action: setHideGaps

hide columns that are entirely (or mostly, see allowedGappyness) gaps

```js
// type signature
setHideGaps: (arg: boolean) => void
```

#### action: setHideHeader

```js
// type signature
setHideHeader: (arg: boolean) => void
```

#### action: setHighlightedColumns

set highlighted columns

Public API: jbrowse-plugin-msaview calls this from its afterCreateAutoruns, and
MSAViewer passes its `highlightColumns` prop through it.

```js
// type signature
setHighlightedColumns: (columns?: number[]) => void
```

#### action: setHighlights

```js
// type signature
setHighlights: (highlights: Highlight[]) => void
```

#### action: setHighResScaleFactor

update the canvas scale factor when the device pixel ratio changes (moving
between monitors, browser zoom)

```js
// type signature
setHighResScaleFactor: (arg: number) => void
```

#### action: setHostCarriesData

declare that this host restores the loaded documents itself, which hides the
"Not in the link" warning. See `hostCarriesData`

```js
// type signature
setHostCarriesData: (arg: boolean) => void
```

#### action: setHoveredTreeNode

set hovered tree node and its descendants

```js
// type signature
setHoveredTreeNode: (nodeId?: string) => void
```

#### action: setLoadingMSA

```js
// type signature
setLoadingMSA: (arg: boolean) => void
```

#### action: setLoadingTree

```js
// type signature
setLoadingTree: (arg: boolean) => void
```

#### action: setMouseClickPos

set mouse click position (row, column) in the MSA

```js
// type signature
setMouseClickPos: (col?: number, row?: number) => void
```

#### action: setMousePos

set mouse position (row, column) in the MSA

Public API: a host calls this (and reads `mouseCol`) to sync hover with its own
view, such as a genome view or 3D structure. Keep the name and signature stable.

```js
// type signature
setMousePos: (col?: number, row?: number) => void
```

#### action: setMSA

```js
// type signature
setMSA: (result: string) => void
```

#### action: setMSAFilehandle

```js
// type signature
setMSAFilehandle: (msaFilehandle?: FileLocationType) => void
```

#### action: setResidueMappings

replace the alignment<->structure correspondence (see docs/layers.md)

```js
// type signature
setResidueMappings: (mappings: ResidueMapping[]) => void
```

#### action: setRowData

replace the row table, which the model keeps as the JSON string
`data.treeMetadata` (see docs/layers.md)

```js
// type signature
setRowData: (rowData: Record<string, Record<string, string>>) => void
```

#### action: setRowHeight

set row height (px)

```js
// type signature
setRowHeight: (n: number) => void
```

#### action: setRowPanels

replace the panels drawn between the tree and the alignment

```js
// type signature
setRowPanels: (panels: RowPanelSpec[]) => void
```

#### action: setScrollX

```js
// type signature
setScrollX: (n: number) => void
```

#### action: setScrollY

set scroll Y-offset (px), clamped to keep the alignment in view

```js
// type signature
setScrollY: (n: number) => void
```

#### action: setScrollZoom

```js
// type signature
setScrollZoom: (arg: boolean) => void
```

#### action: setScrollZoomAxis

```js
// type signature
setScrollZoomAxis: (arg: "both" | "horizontal" | "vertical") => void
```

#### action: setShowDomainLegend

expand or collapse the domain legend that floats over the alignment

```js
// type signature
setShowDomainLegend: (arg: boolean) => void
```

#### action: setShowDomains

toggle the annotation overlay on the alignment

```js
// type signature
setShowDomains: (arg: boolean) => void
```

#### action: setShowOnly

show only the subtree rooted at the given node id (pass undefined to show the
whole tree again)

```js
// type signature
setShowOnly: (node?: string) => void
```

#### action: setStatus

```js
// type signature
setStatus: (status?: { msg: string; onCancel?: () => void; }) => void
```

#### action: setSubFeatureRows

```js
// type signature
setSubFeatureRows: (arg: boolean) => void
```

#### action: setTrackHeight

resize every track sharing a `heightKey`; see `trackHeights`

```js
// type signature
setTrackHeight: (heightKey: string, height: number) => void
```

#### action: setTree

```js
// type signature
setTree: (result: string) => void
```

#### action: setTreeFilehandle

```js
// type signature
setTreeFilehandle: (treeFilehandle?: FileLocationType) => void
```

#### action: setTreeMetadata

```js
// type signature
setTreeMetadata: (result: string) => void
```

#### action: setTreeMetadataFilehandle

```js
// type signature
setTreeMetadataFilehandle: (treeMetadataFilehandle?: FileLocationType) => void
```

#### action: setWidth

```js
// type signature
setWidth: (arg: number) => void
```

#### action: toggleCollapsed

collapse or un-collapse the subtree rooted at the given tree node id

```js
// type signature
toggleCollapsed: (node: string) => void
```

#### action: toggleTrack

```js
// type signature
toggleTrack: (id: string) => void
```

#### action: treeOverviewClick

focus the subtree a click `y` pixels down the tree overview lands on. A click
inside the box already drawn there clears the focus, the way clicking the
focused branch again does.

```js
// type signature
treeOverviewClick: (y: number) => void
```

#### action: zoomIn

```js
// type signature
zoomIn: () => void
```

#### action: zoomInHorizontal

```js
// type signature
zoomInHorizontal: () => void
```

#### action: zoomInVertical

```js
// type signature
zoomInVertical: () => void
```

#### action: zoomOut

```js
// type signature
zoomOut: () => void
```

#### action: zoomOutHorizontal

```js
// type signature
zoomOutHorizontal: () => void
```

#### action: zoomOutVertical

```js
// type signature
zoomOutVertical: () => void
```

#### action: zoomToPos

Smoothly zoom by a continuous scaleFactor. The column under the cursor
(offsetX/offsetY, px relative to the MSA area) stays anchored horizontally.
Vertically the anchor is biased toward y=0 when the alignment nearly fits the
viewport, fading to cursor-anchoring as the alignment grows taller than the
viewport. Drives wheel/trackpad-pinch zoom. `axis` holds one cell dimension
fixed; the held axis still re-anchors its scroll offset, since the other one can
change how much of the alignment fits.

```js
// type signature
zoomToPos: (scaleFactor: number, offsetX: number, offsetY: number, axis?: "both" | "horizontal" | "vertical") => void
```

#### action: zoomToRegion

zoom and scroll so a span fills the alignment's width, in highlight coordinates
(see visibleSpan). Does nothing before the viewer knows its width, or for a span
that resolves to no visible column.

```js
// type signature
zoomToRegion: (region: Region) => void
```
