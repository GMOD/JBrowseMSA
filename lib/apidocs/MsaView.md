---
id: msaview
title: MsaView
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

### Source file

[src/model.ts](https://github.com/GMOD/react-msaview/blob/main/lib/src/model.ts)

extends

- DialogQueueSessionMixin
- MSAModel
- Tree

### MsaView - Properties

#### property: allowedGappyness

```js
// type signature
number
// code
allowedGappyness: 100
```

#### property: collapsed

array of tree parent nodes that are 'collapsed' (all children are hidden)

```js
// type signature
IArrayType<ISimpleType<string>>
// code
collapsed: types.array(types.string)
```

#### property: collapsedLeaves

array of tree leaf nodes that are 'collapsed' (just that leaf node is hidden)

```js
// type signature
IArrayType<ISimpleType<string>>
// code
collapsedLeaves: types.array(types.string)
```

#### property: colWidth

width of columns, px

```js
// type signature
number
// code
colWidth: 14
```

#### property: contrastLettering

```js
// type signature
true
// code
contrastLettering: true
```

#### property: currentAlignment

```js
// type signature
number
// code
currentAlignment: 0
```

#### property: data

data from the loaded tree/msa/treeMetadata, generally loaded by autorun

```js
// type signature
IOptionalIType<IModelType<{ tree: IMaybe<ISimpleType<string>>; msa: IMaybe<ISimpleType<string>>; treeMetadata: IMaybe<ISimpleType<string>>; }, { ...; }, _NotCustomized, { ...; }>, [...]>
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
drawMsaLetters: true
```

#### property: drawTreeText

```js
// type signature
true
// code
drawTreeText: true
```

#### property: featureFilters

```js
// type signature
IMapType<ISimpleType<boolean>>
// code
featureFilters: types.map(types.boolean)
```

#### property: height

height of the div containing the view, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
height: types.optional(types.number, 550)
```

#### property: hideGaps

```js
// type signature
false
// code
hideGaps: false
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

filehandle object for the MSA (which could contain a tree e.g. with stockholm
files)

```js
// type signature
IMaybe<ISnapshotProcessor<ITypeUnion<ModelCreationType<ExtractCFromProps<{ locationType: ISimpleType<"UriLocation">; uri: ISimpleType<string>; baseUri: IMaybe<ISimpleType<string>>; internetAccountId: IMaybe<...>; internetAccountPreAuthorization: IMaybe<...>; }>> | ModelCreationType<...> | ModelCreationType<...>, { ....
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
rowHeight: 18
```

#### property: scrollX

scroll position, X-offset, px

```js
// type signature
number
// code
scrollX: 0
```

#### property: scrollY

scroll position, Y-offset, px

```js
// type signature
number
// code
scrollY: 0
```

#### property: showDomains

```js
// type signature
false
// code
showDomains: false
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
subFeatureRows: false
```

#### property: treeFilehandle

filehandle object for the tree

```js
// type signature
IMaybe<ISnapshotProcessor<ITypeUnion<ModelCreationType<ExtractCFromProps<{ locationType: ISimpleType<"UriLocation">; uri: ISimpleType<string>; baseUri: IMaybe<ISimpleType<string>>; internetAccountId: IMaybe<...>; internetAccountPreAuthorization: IMaybe<...>; }>> | ModelCreationType<...> | ModelCreationType<...>, { ....
// code
treeFilehandle: types.maybe(FileLocation)
```

#### property: treeMetadataFilehandle

filehandle object for tree metadata

```js
// type signature
IMaybe<ISnapshotProcessor<ITypeUnion<ModelCreationType<ExtractCFromProps<{ locationType: ISimpleType<"UriLocation">; uri: ISimpleType<string>; baseUri: IMaybe<ISimpleType<string>>; internetAccountId: IMaybe<...>; internetAccountPreAuthorization: IMaybe<...>; }>> | ModelCreationType<...> | ModelCreationType<...>, { ....
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

### MsaView - Getters

#### getter: actuallyShowDomains

```js
// type
boolean
```

#### getter: adapterTrackModels

```js
// type
ITextTrack[]
```

#### getter: alignmentNames

```js
// type
any
```

#### getter: blanks

```js
// type
any[]
```

#### getter: blanksSet

```js
// type
Set<unknown>
```

#### getter: blocks2d

```js
// type
any[]
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
{ [k: string]: number; }
```

#### getter: columns

```js
// type
{ [k: string]: any; }
```

#### getter: columns2d

```js
// type
any
```

#### getter: conservation

```js
// type
string[]
```

#### getter: dataInitialized

```js
// type
boolean
```

#### getter: fillPalette

```js
// type
Record<string, string>
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

#### getter: hierarchy

generates a new tree that is clustered with x,y positions

```js
// type
HierarchyNode<NodeWithIdsAndLength>
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
any
```

#### getter: maxScrollX

```js
// type
number
```

#### getter: menuItems

```js
// type
() => any[]
```

#### getter: mouseOverRowName

```js
// type
any
```

#### getter: MSA

```js
// type
;ClustalMSA | EmfMSA | StockholmMSA | FastaMSA
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

#### getter: noDomains

```js
// type
boolean
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

#### getter: realAllowedGappyness

```js
// type
number
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
any
```

#### getter: secondaryStructureConsensus

```js
// type
any
```

#### getter: seqConsensus

```js
// type
any
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

#### getter: strokePalette

```js
// type
{ [k: string]: string; }
```

#### getter: tidyFilteredGatheredInterProAnnotations

```js
// type
Record<string, unknown[]>
```

#### getter: tidyFilteredInterProAnnotations

```js
// type
any
```

#### getter: tidyInterProAnnotations

```js
// type
any[]
```

#### getter: tidyInterProAnnotationTypes

```js
// type
Map<string, Accession>
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
ITextTrack[]
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
any
```

#### getter: verticalScrollbarWidth

```js
// type
0 | 20
```

#### getter: viewInitialized

```js
// type
boolean
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
getRowData: (name: string) => { data: any; treeMetadata: any; }
```

#### method: mouseOverCoordToGapRemovedRowCoord

return a row-specific sequence coordinate, skipping gaps, given a global
coordinate

```js
// type signature
mouseOverCoordToGapRemovedRowCoord: (rowName: string, position: number) => number
```

#### method: mouseOverCoordToRowLetter

return a row-specific letter, or undefined if gap

```js
// type signature
mouseOverCoordToRowLetter: (rowName: string, position: number) => any
```

#### method: seqCoordToRowSpecificGlobalCoord

return a global coordinate given a row-specific sequence coordinate which does
not not include gaps

```js
// type signature
seqCoordToRowSpecificGlobalCoord: (rowName: string, position: number) => number
```

### MsaView - Actions

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
drawRelativeTo: (id: string) => void
```

#### action: exportSVG

```js
// type signature
exportSVG: (opts: { theme: Theme; includeMinimap?: boolean; exportType: string; }) => Promise<void>
```

#### action: incrementRef

internal, used for drawing to canvas

```js
// type signature
incrementRef: () => void
```

#### action: initFilter

```js
// type signature
initFilter: (arg: string) => void
```

#### action: reset

```js
// type signature
reset: () => void
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

#### action: setContrastLettering

```js
// type signature
setContrastLettering: (arg: boolean) => void
```

#### action: setCurrentAlignment

```js
// type signature
setCurrentAlignment: (n: number) => void
```

#### action: setData

```js
// type signature
setData: (data: { msa?: string; tree?: string; treeMetadata?: string; }) => void
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

#### action: setFilter

```js
// type signature
setFilter: (arg: string, flag: boolean) => void
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

#### action: setInterProAnnotations

```js
// type signature
setInterProAnnotations: (data: Record<string, InterProScanResults>) => void
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
setMSAFilehandle: (msaFilehandle?: FileLocation) => void
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
setShowOnly: (node?: string) => void
```

#### action: setStatus

```js
// type signature
setStatus: (status?: { msg: string; url?: string; }) => void
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
setTreeFilehandle: (treeFilehandle?: FileLocation) => void
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

#### action: toggleCollapsed2

```js
// type signature
toggleCollapsed2: (node: string) => void
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
