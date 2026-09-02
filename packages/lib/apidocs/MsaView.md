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
showBranchLen, drawTree, drawNodeBubbles, autoTreeAreaWidth

**Actions:** setTreeAreaWidth, setTreeWidth, setLabelsAlignRight, setDrawTree,
setAutoTreeAreaWidth, setShowBranchLen, setDrawNodeBubbles, setDrawLabels

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

#### property: collapsed

array of tree parent nodes that are 'collapsed' (all children are hidden)

```js
// type signature
IOptionalIType<IArrayType<ISimpleType<string>>, [undefined]>
// code
collapsed: stripDefault(types.array(types.string), [])
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

#### property: featureFilters

```js
// type signature
IOptionalIType<IMapType<ISimpleType<boolean>>, [undefined]>
// code
featureFilters: stripDefault(types.map(types.boolean), {})
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
`{rows}`, each with an optional `label` and `color`. Persists in the snapshot,
so a computed answer travels in the URL.

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

#### property: rowHeight

height of each row, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
rowHeight: stripDefault(types.number, defaultRowHeight)
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

#### property: showDomainLegend

whether the domain legend is expanded. The legend floats over the top-right of
the alignment, so on a tall panel it covers real residues -- persisting the
state is what lets a reader collapse it and keep it collapsed, and what lets a
session or a figure open with it already out of the way.

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
ISimpleType<"MsaView">
// code
type: types.literal('MsaView')
```

### MsaView - Volatiles

#### volatile: annotations

overlay annotations drawn on the alignment, whatever their source. Every source
-- InterProScan, GFF, a user upload -- converts to this flat list before it
reaches the model, so nothing downstream of here knows which one it came from

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

#### volatile: conservationTrackHeight

```js
// type signature
number
// code
conservationTrackHeight: 40
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

#### volatile: highlightedColumns

array of column indices to highlight

```js
// type signature
number[]
// code
highlightedColumns: undefined as number[] | undefined
```

#### volatile: highResScaleFactor

high resolution scale factor, helps make canvas look better on hi-dpi screens.
derived from the device pixel ratio so canvases are crisp on retina/4k displays
and not needlessly oversized on standard ones

```js
// type signature
number
// code
highResScaleFactor: typeof window === 'undefined' ? 1 : window.devicePixelRatio
```

#### volatile: hoveredTreeNode

the currently hovered tree node ID and its descendant leaf names

```js
// type signature
{ nodeId: string; descendantNames: string[]; }
// code
hoveredTreeNode: undefined as
        { nodeId: string; descendantNames: string[] } | undefined
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

#### volatile: resizeHandleWidth

resize handle width between tree and msa area, px

```js
// type signature
number
// code
resizeHandleWidth: 5
```

#### volatile: sequenceLogoTrackHeight

taller than the conservation track by default: the logo spends its height on
stacked glyphs, and a 40px stack of four residues leaves each one too short to
identify

```js
// type signature
number
// code
sequenceLogoTrackHeight: 80
```

#### volatile: status

```js
// type signature
{ msg: string; url?: string; onCancel?: () => void; }
// code
status: undefined as
        { msg: string; url?: string; onCancel?: () => void } | undefined
```

#### volatile: volatileWidth

```js
// type signature
number
// code
volatileWidth: undefined as number | undefined
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

#### getter: categoricalDomainTypes

categorical feature types (InterPro domains and the like) that each get their
own color and a legend entry

```js
// type
any[]
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
across, keyed by row name. Each row is ordered longest-first so a short domain
nested inside a long one draws on top of it rather than under it. Resolving
these once here rather than inside each canvas block removes a per-feature,
per-block sequence position conversion from every redraw, and gives the letter
renderer the band colors it needs to keep residues readable on top of the boxes.

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
as one bordered band. Computed here because the overlay canvas redraws on every
mouse move while the highlight itself rarely changes.

```js
// type
{
  start: number
  end: number
}
;[]
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
highlights every tip below it). Shared by the tree and MSA overlay canvases so
they cannot disagree, and resolved through the memoized name->index map rather
than rebuilding a lookup on each mouse move.

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

#### getter: maxBranchLength

max branch length across the tree, used to scale phylogram x-positions

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

most-negative allowed scrollY, keeping the last row in view rather than letting
the whole alignment scroll off the top.

```js
// type
number
```

#### getter: mouseOverColumnStats

per-column summary statistics for the hovered column: consensus residue and its
identity fraction, conservation score, gap fraction, and the sorted non-gap
residue distribution. undefined when nothing is hovered.

```js
// type
{ col: number; total: number; gaps: number; gapFraction: number; conservation: number; propertyConservation: number; consensusLetter: string; consensusCount: number; consensusFraction: number; distribution: [...][]; }
```

#### getter: mouseOverDomains

domain annotations under the mouse, hit-tested against the exact visible column
span each box is drawn at (so it matches the overlay across gaps)

```js
// type
any
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

widget width minus the tree area gives the space for the MSA

```js
// type
number
```

#### getter: msaAreaWidth

widget width minus the tree area gives the space for the MSA

```js
// type
number
```

#### getter: msaCanvasWidth

width of the alignment canvas itself: the msa area less the vertical scrollbar
sitting in it. Not usable from showHorizontalScrollbar, which feeds
msaAreaHeight -> showVerticalScrollbar and would close a cycle

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

number of rows the alignment occupies on screen. This is the leaf count, not
`rows.length`: a tree leaf with no matching MSA row still takes up a row of
vertical space (drawn blank), so row hit-testing and fit-to-height must count
it.

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

#### getter: resolvedHighlights

`highlights` projected onto what is on screen: residue spans go through the
named row's gap structure, column spans through the hidden-column list, and a
span that lands entirely on hidden columns is dropped. Row names that match no
row are ignored.

```js
// type
ResolvedHighlight[]
```

#### getter: root

```js
// type
HierarchyNode<any>
```

#### getter: rowMap

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

#### getter: rows

```js
// type
any
```

#### getter: secondaryStructureConsensus

```js
// type
string
```

#### getter: segmentDomainTypes

ordinal segment types (exons etc.), ordered by sequence position so
exon-1..exon-14 read left-to-right; colored by alternating shade and labeled by
number rather than each getting a distinct hue + legend row

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

#### getter: seqPosGlobalColIndex

per-row index of the global column holding each ungapped sequence position, so
seqPos -> column is a lookup rather than a scan of the row. The domain overlay
resolves thousands of these per redraw.

```js
// type
Map<unknown, unknown>
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

#### getter: tracks

```js
// type
BasicTrack[]
```

#### getter: tree

```js
// type
NodeWithIds
```

#### getter: treeAreaWidthMinusMargin

```js
// type
number
```

#### getter: treeMetadata

extra per-row attributes, keyed by row name. Parsed defensively: the source is a
user-supplied document (treeMetadataFilehandle, or a session snapshot), and this
computed is read by labelWidthMap on every layout, so a malformed file would
otherwise throw out of rendering and take the whole view down over a decorative
field.

```js
// type
Record<string, Record<string, string>>
```

#### getter: turnedOnTracks

```js
// type
any
```

#### getter: verticalScrollbarWidth

```js
// type
0 | 20
```

#### getter: visibleDomainTypes

the domain types currently drawn on the alignment (filtered-on), shared by the
on-screen legend and the SVG export legend. Ordinal segments (exons) are
excluded — they read as a numbered gene model, not a color key — so this is the
categorical types ordered by sequence position

```js
// type
any
```

#### getter: visibleMsaHeight

height of the alignment viewport, px. The same subtraction as msaAreaHeight,
which is defined later in the views chain

```js
// type
number
```

#### getter: width

```js
// type
number
```

### MsaView - Methods

#### method: extraViewMenuItems

unused here, but can be used by derived classes to add extra items

```js
// type signature
extraViewMenuItems: () => any[]
```

#### method: getRowData

```js
// type signature
getRowData: (name: string) => { data: { name?: string; accession?: string; dbxref?: string; }; treeMetadata: Record<string, string>; }
```

#### method: globalColToVisibleCol

Convert a global column index to a visible column index. Returns undefined if
the column is hidden (in blanks). This is the inverse of visibleColToGlobalCol.

```js
// type signature
globalColToVisibleCol: (globalCol: number) => number
```

#### method: seqPosToGlobalCol

Convert a sequence position (ungapped) to a global column index.

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

#### method: visibleColToRowLetter

Return a row-specific letter at a visible column, or undefined if gap.

```js
// type signature
visibleColToRowLetter: (rowName: string, visibleCol: number) => any
```

#### method: visibleColToSeqPos

Convert a visible column to a row-specific sequence position (0-based). Returns
undefined if the position is a gap in the sequence.

CROSS-REPO CONTRACT: this and the sibling coordinate converters
(seqPosToVisibleCol, globalColToVisibleCol, seqPosToGlobalCol) are used by
jbrowse-plugin-protein3d to translate between alignment columns and
structure/sequence residue positions across gaps. Keep them stable.

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

### MsaView - Actions

#### action: calculateNeighborJoiningTreeFromMSA

Calculate a neighbor joining tree from the current MSA using BLOSUM62 distances

```js
// type signature
calculateNeighborJoiningTreeFromMSA: () => void
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

#### action: reset

Return to the import form: every property off `preservedOnReset` (data,
filehandles, collapsed/showOnly, zoom, scroll, ...) goes back to its default,
then the file-derived volatiles applySnapshot cannot reach are cleared by hand.

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

Set the overlay annotations and reveal the overlay in a single step (an empty
list clears both). Every source funnels through here after its own adapter has
flattened it: InterProScan, GFF, user uploads, NCBI CDD.

```js
// type signature
setAnnotations: (annotations: Annotation[]) => void
```

#### action: setColWidth

set col width (px)

```js
// type signature
setColWidth: (n: number) => void
```

#### action: setConservationTrackHeight

```js
// type signature
setConservationTrackHeight: (arg: number) => void
```

#### action: setCurrentAlignment

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

#### action: setError

set error state

```js
// type signature
setError: (error?: unknown) => void
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

#### action: setHighlightedColumns

set highlighted columns

CROSS-REPO CONTRACT: called by jbrowse-plugin-msaview (afterCreateAutoruns.ts)
to highlight alignment columns. It has no in-repo caller, so do not flag it as
dead code — it is public API.

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

high-res scale factor, tracks the device pixel ratio so canvases stay crisp when
the window moves between monitors or the browser zooms

```js
// type signature
setHighResScaleFactor: (arg: number) => void
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

CROSS-REPO CONTRACT: jbrowse-plugin-protein3d calls this (and reads the
`mouseCol` volatile) to sync MSA<->3D-structure hover. Keep the name and
signature stable; see that repo's ProteinToMsaHoverSync.tsx.

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

#### action: setRowHeight

set row height (px)

```js
// type signature
setRowHeight: (n: number) => void
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

#### action: setSequenceLogoTrackHeight

```js
// type signature
setSequenceLogoTrackHeight: (arg: number) => void
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
setStatus: (status?: { msg: string; url?: string; onCancel?: () => void; }) => void
```

#### action: setSubFeatureRows

```js
// type signature
setSubFeatureRows: (arg: boolean) => void
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
Vertically the anchor is biased toward the top: when the alignment nearly fits
the viewport, snap to y=0 rather than pinning a random row under the cursor,
with the bias fading out as the alignment grows taller than the viewport (where
cursor-anchoring is useful). Drives wheel/trackpad-pinch zoom.

```js
// type signature
zoomToPos: (scaleFactor: number, offsetX: number, offsetY: number) => void
```
