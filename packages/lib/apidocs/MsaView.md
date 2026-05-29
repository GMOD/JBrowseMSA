---
id: msaview
title: MsaView
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

[Source code](https://github.com/GMOD/react-msaview/blob/main/packages/lib/src/model.ts)

## Docs

extends

- [DialogQueueSessionMixin](../dialogqueuesessionmixin)
- [MSAModel](../msamodel)
- [Tree](../tree)

## Inherited members

Available on this model via composition. Follow each link for full signatures and docs.

### Available via [DialogQueueSessionMixin](../dialogqueuesessionmixin)

**Getters:** DialogComponent, DialogProps

**Actions:** removeActiveDialog, queueDialog

### Available via [MSAModel](../msamodel)

**Properties:** bgColor, colorSchemeName

**Actions:** setColorSchemeName, setBgColor

### Available via [Tree](../tree)

**Properties:** drawLabels, labelsAlignRight, treeAreaWidth, treeWidth, showBranchLen, drawTree, drawNodeBubbles

**Actions:** setTreeAreaWidth, setTreeWidth, setLabelsAlignRight, setDrawTree, setShowBranchLen, setDrawNodeBubbles, setDrawLabels

### MsaView - Properties

#### property: allowedGappyness

```js
// type signature
number
// code
allowedGappyness: defaultAllowedGappyness
```

#### property: collapsed

array of tree parent nodes that are 'collapsed' (all children are
hidden)

```js
// type signature
IArrayType<ISimpleType<string>>
// code
collapsed: types.array(types.string)
```

#### property: colWidth

width of columns, px

```js
// type signature
number
// code
colWidth: defaultColWidth
```

#### property: currentAlignment

```js
// type signature
number
// code
currentAlignment: defaultCurrentAlignment
```

#### property: data

data from the loaded tree/msa/treeMetadata, generally loaded by
autorun

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
true
// code
drawMsaLetters: defaultDrawMsaLetters
```

#### property: featureFilters

```js
// type signature
IMapType<ISimpleType<boolean>>
// code
featureFilters: types.map(types.boolean)
```

#### property: gffFilehandle

filehandle object for InterProScan GFF file

```js
// type signature
IMaybe<ISnapshotProcessor<ITypeUnion<any, { locationType: "UriLocation"; uri: string; internetAccountId: string | undefined; internetAccountPreAuthorization: { internetAccountType: string; authInfo: any; } | undefined; } | { ...; } | { ...; } | { ...; }, any>, _NotCustomized, _NotCustomized>>
// code
gffFilehandle: types.maybe(FileLocation)
```

#### property: height

height of the div containing the view, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
height: types.optional(types.number, defaultHeight)
```

#### property: hideGaps

```js
// type signature
true
// code
hideGaps: defaultHideGaps
```

#### property: id

id of view, randomly generated if not provided

```js
// type signature
IOptionalIType<ISimpleType<string>, [undefined]>
// code
id: ElementId
```

#### property: msaFilehandle

filehandle object for the MSA (which could contain a tree e.g. with
stockholm files)

```js
// type signature
IMaybe<ISnapshotProcessor<ITypeUnion<any, { locationType: "UriLocation"; uri: string; internetAccountId: string | undefined; internetAccountPreAuthorization: { internetAccountType: string; authInfo: any; } | undefined; } | { ...; } | { ...; } | { ...; }, any>, _NotCustomized, _NotCustomized>>
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
number
// code
rowHeight: defaultRowHeight
```

#### property: scrollX

scroll position, X-offset, px

```js
// type signature
number
// code
scrollX: defaultScrollX
```

#### property: scrollY

scroll position, Y-offset, px

```js
// type signature
number
// code
scrollY: defaultScrollY
```

#### property: showDomains

```js
// type signature
false
// code
showDomains: defaultShowDomains
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
false
// code
subFeatureRows: defaultSubFeatureRows
```

#### property: treeFilehandle

filehandle object for the tree

```js
// type signature
IMaybe<ISnapshotProcessor<ITypeUnion<any, { locationType: "UriLocation"; uri: string; internetAccountId: string | undefined; internetAccountPreAuthorization: { internetAccountType: string; authInfo: any; } | undefined; } | { ...; } | { ...; } | { ...; }, any>, _NotCustomized, _NotCustomized>>
// code
treeFilehandle: types.maybe(FileLocation)
```

#### property: treeMetadataFilehandle

filehandle object for tree metadata

```js
// type signature
IMaybe<ISnapshotProcessor<ITypeUnion<any, { locationType: "UriLocation"; uri: string; internetAccountId: string | undefined; internetAccountPreAuthorization: { internetAccountType: string; authInfo: any; } | undefined; } | { ...; } | { ...; } | { ...; }, any>, _NotCustomized, _NotCustomized>>
// code
treeMetadataFilehandle: types.maybe(FileLocation)
```

#### property: turnedOffTracks

turned off tracks

```js
// type signature
IMapType<ISimpleType<boolean>>
// code
turnedOffTracks: types.map(types.boolean)
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
number[] | undefined
// code
highlightedColumns: undefined as number[] | undefined
```

#### volatile: highResScaleFactor

high resolution scale factor, helps make canvas look better on hi-dpi
screens

```js
// type signature
number
// code
highResScaleFactor: 2
```

#### volatile: hoveredTreeNode

the currently hovered tree node ID and its descendant leaf names

```js
// type signature
{ nodeId: string; descendantNames: string[]; } | undefined
// code
hoveredTreeNode: undefined as
        | { nodeId: string; descendantNames: string[] }
        | undefined
```

#### volatile: interProAnnotations

```js
// type signature
Record<string, InterProScanResults> | undefined
// code
interProAnnotations: undefined as
        | undefined
        | Record<string, InterProScanResults>
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
number | undefined
// code
mouseClickCol: undefined as number | undefined
```

#### volatile: mouseClickRow

the currently mouse-click row

```js
// type signature
number | undefined
// code
mouseClickRow: undefined as number | undefined
```

#### volatile: mouseCol

the currently mouse-hovered column

```js
// type signature
number | undefined
// code
mouseCol: undefined as number | undefined
```

#### volatile: mouseRow

the currently mouse-hovered row

```js
// type signature
number | undefined
// code
mouseRow: undefined as number | undefined
```

#### volatile: nref

a dummy variable that is incremented when ref changes so autorun for
drawing canvas commands will run

```js
// type signature
number
// code
nref: 0
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
{ msg: string; url?: string | undefined; onCancel?: (() => void) | undefined; } | undefined
// code
status: undefined as
        | { msg: string; url?: string; onCancel?: () => void }
        | undefined
```

#### volatile: volatileWidth

```js
// type signature
number | undefined
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
string[]
```

#### getter: allBranchesLength0

```js
// type
boolean
```

#### getter: blanks

```js
// type
number[]
```

#### getter: blanksSet

```js
// type
Set<number>
```

#### getter: blocks2d

```js
// type
(readonly [number, number])[]
```

#### getter: blocksX

```js
// type
number[]
```

#### getter: blocksY

```js
// type
number[]
```

#### getter: colClustalX

Pre-computed ClustalX colors per column.
Returns a map of letter -> color for each column.
ref http://www.jalview.org/help/html/colourSchemes/clustal.html

```js
// type
;(Record < string, string > [])
```

#### getter: colConsensus

Pre-computed consensus letter and percent identity color per column.
Used by percent_identity_dynamic color scheme.

```js
// type
{
  letter: string
  color: string | undefined
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
;(Record < string, number > [])
```

#### getter: colStatsSums

```js
// type
number[]
```

#### getter: columns

```js
// type
{ [k: string]: string; }
```

#### getter: columns2d

```js
// type
string[]
```

#### getter: conservation

Conservation score per column using Shannon entropy (biojs-msa style).
Conservation = (1 - H/Hmax) \* (1 - gapFraction)
Returns values 0-1 where 1 = fully conserved, 0 = no conservation.

```js
// type
number[]
```

#### getter: dataInitialized

```js
// type
;boolean | '' | undefined
```

#### getter: fontSize

```js
// type
number
```

#### getter: header

```js
// type
Record<string, unknown>
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

#### getter: hoveredCell

Returns information about the currently hovered cell

```js
// type
{ rowName: string; col: number; base: string; seqPos: number | undefined; } | undefined
```

#### getter: hoveredInsertion

Returns insertion info if mouse is hovering over an insertion indicator

```js
// type
{ rowName: string; col: number; letters: string; } | undefined
```

#### getter: insertionPositions

Returns a map of row name to array of insertions with display position and letters

```js
// type
Map<string, { pos: number; letters: string; }[]>
```

#### getter: isLoading

```js
// type
boolean
```

#### getter: labelsWidth

```js
// type
number
```

#### getter: leaves

```js
// type
HierarchyNode < NodeWithIdsAndLength > []
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

#### getter: mouseOverRowName

```js
// type
string | undefined
```

#### getter: MSA

```js
// type
MSAParserType | null
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

```js
// type
number
```

#### getter: realAllowedGappyness

```js
// type
number
```

#### getter: root

```js
// type
HierarchyNode<NodeWithIds>
```

#### getter: rowMap

```js
// type
Map<string, string>
```

#### getter: rowNames

```js
// type
string[]
```

#### getter: rowNamesSet

```js
// type
Map<string, number>
```

#### getter: rows

```js
// type
[string, string][]
```

#### getter: secondaryStructureConsensus

```js
// type
string | undefined
```

#### getter: seqConsensus

```js
// type
string | undefined
```

#### getter: sequenceType

Detects sequence type based on letters present in the alignment.
Returns 'dna', 'rna', or 'amino'.

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
number
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

```js
// type
any
```

#### getter: turnedOnTracks

```js
// type
BasicTrack[]
```

#### getter: verticalScrollbarWidth

```js
// type
0 | 20
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
extraViewMenuItems: () => never[]
```

#### method: getRowData

```js
// type signature
getRowData: (name: string) => { data: { name?: string | undefined; accession?: string | undefined; dbxref?: string | undefined; } | undefined; treeMetadata: any; }
```

#### method: globalColToVisibleCol

Convert a global column index to a visible column index.
Returns undefined if the column is hidden (in blanks).
This is the inverse of visibleColToGlobalCol.

```js
// type signature
globalColToVisibleCol: (globalCol: number) => number | undefined
```

#### method: seqPosToGlobalCol

Convert a sequence position (ungapped) to a global column index.

```js
// type signature
seqPosToGlobalCol: (rowName: string, seqPos: number) => number
```

#### method: seqPosToVisibleCol

Convert a sequence position (ungapped) directly to a visible column index.
This combines seqPosToGlobalCol and globalColToVisibleCol.

```js
// type signature
seqPosToVisibleCol: (rowName: string, seqPos: number) => number | undefined
```

#### method: visibleColToRowLetter

Return a row-specific letter at a visible column, or undefined if gap.

```js
// type signature
visibleColToRowLetter: (rowName: string, visibleCol: number) => string | undefined
```

#### method: visibleColToSeqPos

Convert a visible column to a row-specific sequence position (0-based).
Returns undefined if the position is a gap in the sequence.

```js
// type signature
visibleColToSeqPos: (rowName: string, visibleCol: number) => number | undefined
```

#### method: visibleColToSeqPosOneBased

Convert a visible column to a row-specific sequence position (1-based).
Returns undefined if the position is a gap in the sequence.

```js
// type signature
visibleColToSeqPosOneBased: (rowName: string, visibleCol: number) => number | undefined
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

```js
// type signature
drawRelativeTo: (id: string | undefined) => void
```

#### action: exportSVG

```js
// type signature
exportSVG: (opts: { theme: Theme; includeMinimap?: boolean | undefined; includeTracks?: boolean | undefined; exportType: string; }) => Promise<void>
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

#### action: incrementRef

internal, used for drawing to canvas

```js
// type signature
incrementRef: () => void
```

#### action: reset

```js
// type signature
reset: () => void
```

#### action: resetZoom

```js
// type signature
resetZoom: () => void
```

#### action: setAllowedGappyness

```js
// type signature
setAllowedGappyness: (arg: number) => void
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

```js
// type signature
setData: (data: { msa?: string | undefined; tree?: string | undefined; treeMetadata?: string | undefined; gff?: string | undefined; }) => void
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
setGFFFilehandle: (gffFilehandle?: FileLocation | undefined) => void
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

```js
// type signature
setHideGaps: (arg: boolean) => void
```

#### action: setHighlightedColumns

set highlighted columns

```js
// type signature
setHighlightedColumns: (columns?: number[] | undefined) => void
```

#### action: setHoveredTreeNode

set hovered tree node and its descendants

```js
// type signature
setHoveredTreeNode: (nodeId?: string | undefined) => void
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
setMouseClickPos: (col?: number | undefined, row?: number | undefined) => void
```

#### action: setMousePos

set mouse position (row, column) in the MSA

```js
// type signature
setMousePos: (col?: number | undefined, row?: number | undefined) => void
```

#### action: setMSA

```js
// type signature
setMSA: (result: string) => void
```

#### action: setMSAFilehandle

```js
// type signature
setMSAFilehandle: (msaFilehandle?: FileLocation | undefined) => void
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

set scroll Y-offset (px)

```js
// type signature
setScrollY: (n: number) => void
```

#### action: setShowDomains

```js
// type signature
setShowDomains: (arg: boolean) => void
```

#### action: setShowOnly

```js
// type signature
setShowOnly: (node?: string | undefined) => void
```

#### action: setStatus

```js
// type signature
setStatus: (status?: { msg: string; url?: string | undefined; onCancel?: (() => void) | undefined; } | undefined) => void
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
setTreeFilehandle: (treeFilehandle?: FileLocation | undefined) => void
```

#### action: setTreeMetadata

```js
// type signature
setTreeMetadata: (result: string) => void
```

#### action: setWidth

```js
// type signature
setWidth: (arg: number) => void
```

#### action: toggleCollapsed

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
