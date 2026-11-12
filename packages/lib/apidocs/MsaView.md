---
id: msaview
title: MsaView
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/JBrowseMSA/blob/main/packages/lib/src/model.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this
  model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Example usage

```js
import { types } from '@jbrowse/mobx-state-tree'
import { MSAModelF } from 'react-msaview'

const RootModel = types.model({ view: types.optional(MSAModelF(), {}) })
const root = RootModel.create({})
root.view.setData({ msa: '>seq1\nACGT\n>seq2\nACGT' })
```

`maxInlineSnapshotBytes` is the largest pasted or local document, and the
largest data track, the snapshot keeps; a larger one stays in the live model and
`unshareableData` names it. The standalone app, whose links carry the snapshot
in the URL fragment, raises it.

## Overview

The main MSAView state model. Holds the loaded alignment, tree, and optional
overlay annotations, plus all display state (color scheme, zoom, scroll,
collapsed clades). It composes in members from `DialogQueueSessionMixin`,
`Tree`, and `MSAModel` (see Inherited members below). Data is loaded reactively
from the `msaFilehandle` / `treeFilehandle` / `gffFilehandle` properties, or set
directly with `setData`. Most state is persisted into the shareable URL.

## Inherited members

This model composes the ones below. Each member links to its docs on the page
that declares it.

### From [DialogQueueSessionMixin](./DialogQueueSessionMixin.md)

**Getters:**
[DialogComponent](./DialogQueueSessionMixin.md#getter-dialogcomponent),
[DialogProps](./DialogQueueSessionMixin.md#getter-dialogprops)

**Actions:**
[removeActiveDialog](./DialogQueueSessionMixin.md#action-removeactivedialog),
[queueDialog](./DialogQueueSessionMixin.md#action-queuedialog)

### From [Tree](./Tree.md)

**Properties:** [drawLabels](./Tree.md#property-drawlabels),
[labelsAlignRight](./Tree.md#property-labelsalignright),
[treeAreaWidth](./Tree.md#property-treeareawidth),
[treeWidth](./Tree.md#property-treewidth),
[showBranchLen](./Tree.md#property-showbranchlen),
[treeOrder](./Tree.md#property-treeorder),
[drawTree](./Tree.md#property-drawtree),
[drawNodeBubbles](./Tree.md#property-drawnodebubbles),
[drawNodeLabels](./Tree.md#property-drawnodelabels),
[showTreeOverview](./Tree.md#property-showtreeoverview),
[overviewHeight](./Tree.md#property-overviewheight)

**Actions:** [setTreeAreaWidth](./Tree.md#action-settreeareawidth),
[setTreeWidth](./Tree.md#action-settreewidth),
[setLabelsAlignRight](./Tree.md#action-setlabelsalignright),
[setDrawTree](./Tree.md#action-setdrawtree),
[setShowBranchLen](./Tree.md#action-setshowbranchlen),
[setTreeOrder](./Tree.md#action-settreeorder),
[setDrawNodeBubbles](./Tree.md#action-setdrawnodebubbles),
[setDrawNodeLabels](./Tree.md#action-setdrawnodelabels),
[setShowTreeOverview](./Tree.md#action-setshowtreeoverview),
[setDrawLabels](./Tree.md#action-setdrawlabels)

### From [MSAModel](./MSAModel.md)

**Properties:** [bgColor](./MSAModel.md#property-bgcolor),
[colorSchemeName](./MSAModel.md#property-colorschemename),
[customColorScheme](./MSAModel.md#property-customcolorscheme),
[showColumnStats](./MSAModel.md#property-showcolumnstats),
[msaFormat](./MSAModel.md#property-msaformat)

**Actions:** [setColorSchemeName](./MSAModel.md#action-setcolorschemename),
[setCustomColorScheme](./MSAModel.md#action-setcustomcolorscheme),
[setBgColor](./MSAModel.md#action-setbgcolor),
[setShowColumnStats](./MSAModel.md#action-setshowcolumnstats),
[setMSAFormat](./MSAModel.md#action-setmsaformat)

### MsaView - Properties

#### property: allowedGappyness

```js
allowedGappyness: stripDefault(types.number, 100)
```

#### property: clades

clades of the tree with a mark drawn over them. `mrca` names tips whose common
ancestor is the clade, or `range` its first and last tip in display order, and
`tips` is the leaf count the producer measured. `mark` is `highlight`,
`bracket`, `collapse`, `focus` or `rotate`. See docs/layers.md

```js
clades: stripDefault(types.array(types.frozen<Clade>()), [])
```

#### property: cladesSeeded

whether the `collapse`, `focus` and `rotate` clade marks have seeded
`collapsed`, `showOnly` and `rotated`, so a restored snapshot keeps what the
reader changed after the seeding

```js
cladesSeeded: stripDefault(types.boolean, false)
```

#### property: collapsed

array of tree parent nodes that are 'collapsed' (all children are hidden)

```js
collapsed: stripDefault(types.array(types.string), [])
```

#### property: columnTracks

tracks supplied as data: per-column values drawn as bars, or a per-column string
drawn as a text track. See docs/layers.md

```js
columnTracks: stripDefault(
    types.array(types.frozen<ColumnTrackSpec>()),
    [],
  )
```

#### property: colWidth

width of columns, px

```js
colWidth: stripDefault(types.number, 12)
```

#### property: currentAlignment

```js
currentAlignment: stripDefault(types.number, 0)
```

#### property: data

data from the loaded tree/msa/treeMetadata, generally loaded by autorun

```js
data: types.optional(DataModelF(maxInlineSnapshotBytes), {})
```

#### property: domainFill

whether shown domains fill the cells they cover. Off, the residue scheme keeps
the cells and each domain draws as a bar under its row. See `cellFill`.

```js
domainFill: stripDefault(types.boolean, true)
```

#### property: drawMsaLetters

```js
drawMsaLetters: stripDefault(types.boolean, true)
```

#### property: embeddedMode

draws the toolbar's menus and Settings as icons without text, for a host with
little room, such as a JBrowse view

```js
embeddedMode: stripDefault(types.boolean, false)
```

#### property: encodings

what the viewer's own marks read from `rowData`, the feature table or the tree's
support values: `{channel, field, scale?, legend?}` per color channel, and
`{channel: "featureLabel", field}` or `{channel: "rowLabel", field}` for text.
See docs/layers.md

```js
encodings: stripDefault(types.array(types.frozen<Encoding>()), [])
```

#### property: features

features on the rows as data, `{row, start, end, name, ...}` in residues of each
row, drawn with the GFF's annotations. Persists in the snapshot and the URL.

```js
features: stripDefault(types.array(types.frozen<Feature>()), [])
```

#### property: gffFilehandle

filehandle object for a GFF file of overlay annotations

```js
gffFilehandle: types.maybe(FileLocation)
```

#### property: height

height of the div containing the view, px

```js
height: stripDefault(types.number, 550)
```

#### property: hiddenCategories

the `{field, value}` pairs the reader turned off by clicking a legend row, as
jbrowse-components' ADR-246 names them. A hide applies wherever an ordinal or
identity scale reads its field: the row marks that value colors draw unpainted,
and the features carrying it leave the overlay, the row panels and the tracks.
It waits, unapplied, while no such scale reads the field. The accession key's
rows toggle `turnedOffFeatures` instead, which the filter dialog writes. See
docs/layers.md

```js
hiddenCategories: stripDefault(
    types.array(types.frozen<HiddenCategory>()),
    [],
  )
```

#### property: hideGaps

```js
hideGaps: stripDefault(types.boolean, true)
```

#### property: highlightColumns

declarative seed for the highlighted-columns overlay (visible column indices).
Unlike the volatile `highlightedColumns` (driven by transient genome-hover
sync), this persists in the snapshot/URL so a shared link can open with specific
columns highlighted. Applied once in afterCreate.

```js
highlightColumns: types.frozen<number[] | undefined>()
```

#### property: highlights

labeled highlights in 1-based inclusive coordinates: a column span
`{start, end}`, a residue span `{row, start, end}` of a named row, or a row set
`{rows}`, each with an optional `label` and `color`. A span's `mark` is `band`
(the default) or `bracket`, a labeled bracket in the strip above the alignment.
Persists in the snapshot and the URL.

```js
highlights: stripDefault(types.array(types.frozen<Highlight>()), [])
```

#### property: id

id of view, randomly generated if not provided

```js
id: ElementId
```

#### property: msaFilehandle

filehandle object for the MSA (which could contain a tree e.g. with stockholm
files)

```js
msaFilehandle: types.maybe(FileLocation)
```

#### property: region

where the view opens, in `highlights` coordinates: `{row, start, end}` zooms
onto residues of that row and scrolls the row to the middle, `{start, end}`
zooms onto alignment columns. Applied once the alignment and any tree file have
loaded, then cleared, so a reloaded session keeps the reader's own scroll.

```js
region: types.frozen<Region | undefined>()
```

#### property: relativeTo

```js
relativeTo: types.maybe(types.string)
```

#### property: residueMappings

row-to-structure residue correspondence, computed outside the viewer (e.g. from
SIFTS). Matching by sequence equality places a tagged construct, a truncation or
a subsequence row on the wrong residue. See docs/layers.md

```js
residueMappings: stripDefault(
    types.array(types.frozen<ResidueMapping>()),
    [],
  )
```

#### property: rotated

tree nodes whose children draw in reverse order, which is ggtree's `rotate`: the
same tree, with the clades on either side of the node swapped

```js
rotated: stripDefault(types.array(types.string), [])
```

#### property: rowHeight

height of each row, px

```js
rowHeight: stripDefault(types.number, 16)
```

#### property: rowPanels

panels drawn between the tree and the alignment:
`{kind: "strip", encoding: {fill}, width?, header?}` fills one cell per row from
a `rowData` field, and
`{kind: "features", x, encoding?, transform?, width?, header?}` draws the spans
the GFF carries. See docs/layers.md

```js
rowPanels: stripDefault(types.array(types.frozen<RowPanelSpec>()), [])
```

#### property: rowTransform

the row axis's transforms over `rowData`: `filter` keeps the rows passing every
`{field, oneOf}` or `{field, range}` test, `sort` orders the rows by
`[{field, order}]` where no tree does, and `facet: {field, sort?}` bands them
under a label per value. See docs/layers.md

```js
rowTransform: types.frozen<RowTransform | undefined>()
```

#### property: scrollX

scroll position, X-offset, px

```js
scrollX: stripDefault(types.number, 0)
```

#### property: scrollY

scroll position, Y-offset, px

```js
scrollY: stripDefault(types.number, 0)
```

#### property: scrollZoom

zoom in/out on plain mouse-wheel without holding ctrl

```js
scrollZoom: stripDefault(types.boolean, false)
```

#### property: scrollZoomAxis

which cell dimensions a wheel zoom scales, while `scrollZoom` is on

```js
scrollZoomAxis: stripDefault(
  types.enumeration('ScrollZoomAxis', [...scrollZoomAxes]),
  'both',
)
```

#### property: selection

the block the reader selected: `{start, end}` columns of the file, 1-based
inclusive like a column highlight, and `rows` by name, every row where absent.
Undefined until something is selected, so a view without one adds nothing to the
shared URL.

```js
selection: types.frozen<MsaSelection | undefined>()
```

#### property: showDomainLegend

whether the domain legend is expanded. The legend floats over the top-right of
the alignment and covers residues, so a session or figure can open with it
collapsed.

```js
showDomainLegend: stripDefault(types.boolean, true)
```

#### property: showDomains

```js
showDomains: stripDefault(types.boolean, true)
```

#### property: showOnly

focus on particular subtree

```js
showOnly: types.maybe(types.string)
```

#### property: subFeatureRows

```js
subFeatureRows: stripDefault(types.boolean, false)
```

#### property: trackHeights

the height of every track one divider resizes, keyed by `heightKey`: the `kind`
for the computed tracks, `own:<id>` for a data track. A key is absent until the
user drags that divider, and `defaultTrackHeights` answers for it until then, so
an untouched viewer adds nothing to the shared URL.

```js
trackHeights: stripDefault(types.map(types.number), {})
```

#### property: treeFilehandle

filehandle object for the tree

```js
treeFilehandle: types.maybe(FileLocation)
```

#### property: treeMetadataFilehandle

filehandle object for tree metadata

```js
treeMetadataFilehandle: types.maybe(FileLocation)
```

#### property: treeRoot

where the tree is rooted: `midpoint` roots it halfway along the longest path
between two tips, `{outgroup}` on the branch above the tips named, and undefined
keeps the file's root

```js
treeRoot: types.frozen<TreeRoot | undefined>()
```

#### property: trimToSelection

hide every column outside `selection`, the way `hideGaps` hides the gappy ones.
Without a selection every column shows.

```js
trimToSelection: stripDefault(types.boolean, false)
```

#### property: turnedOffFeatures

the user's departures from each annotation accession's default, keyed by
accession with the value meaning "off", like `turnedOffTracks`. An untouched
accession is absent and takes its default, so the shared URL grows only with the
user's filters

```js
turnedOffFeatures: stripDefault(types.map(types.boolean), {})
```

#### property: turnedOffTracks

the user's explicit show/hide choice per track id, keyed by id with the value
meaning "off". A track the user has never touched is absent and falls back to
its own default (see `defaultOffTracks`), so a hidden-by-default track adds
nothing to the shared URL.

```js
turnedOffTracks: stripDefault(types.map(types.boolean), {})
```

#### property: type

hardcoded view type

```js
type: types.literal('MsaView')
```

### MsaView - Volatiles

#### volatile: annotations

overlay annotations drawn on the alignment. InterProScan JSON, GFF and user
uploads all convert to this flat list

```js
annotations: [] as Annotation[]
```

#### volatile: availableHeight

the height a host that fills its container measures, px. While set it replaces
`height`, stays out of the snapshot, and hides the drag handle

```js
availableHeight: undefined as number | undefined
```

#### volatile: blockSize

size of blocks of content to be drawn, px

```js
blockSize: 500
```

#### volatile: dismissedWarnings

derived warnings the user dismissed, which stay hidden while the data behind
them holds

```js
dismissedWarnings: [] as string[]
```

#### volatile: error

```js
error: undefined as unknown
```

#### volatile: headerHeight

```js
headerHeight: 0
```

#### volatile: hideHeader

leaves the toolbar out, for a host drawing its own controls. Kept out of the
snapshot so a link opened in the full app shows the toolbar.

```js
hideHeader: false
```

#### volatile: highlightedColumns

array of column indices to highlight

```js
highlightedColumns: undefined as number[] | undefined
```

#### volatile: highResScaleFactor

canvas scale factor, from the device pixel ratio

```js
highResScaleFactor: typeof window === 'undefined' ? 1 : window.devicePixelRatio
```

#### volatile: hostCarriesData

set by a host that restores the loaded documents itself, such as a jbrowse
session or a page that refetches them. `unshareableData` then reports nothing

```js
hostCarriesData: false
```

#### volatile: hoveredHighlight

`key` of the highlight whose bracket the pointer is over

```js
hoveredHighlight: undefined as string | undefined
```

#### volatile: hoveredTreeNode

the currently hovered tree node ID and its descendant leaf names

```js
hoveredTreeNode: undefined as
  | { nodeId: string; descendantNames: string[] }
  | undefined
```

#### volatile: importForm

shows the import form while the view has no data. MSAViewer turns it off, since
its host supplies the data and the form is the demo app's

```js
importForm: true
```

#### volatile: loadingMSA

```js
loadingMSA: false
```

#### volatile: loadingTree

```js
loadingTree: false
```

#### volatile: loadWarnings

non-fatal load problems: an optional layer that failed to load, an overlay that
failed to parse. `error` replaces the view and is for the alignment itself.
`warnings` adds the ones derived from the data

```js
loadWarnings: [] as string[]
```

#### volatile: marginLeft

```js
marginLeft: 20
```

#### volatile: minimapHeight

```js
minimapHeight: 56
```

#### volatile: mouseClickCol

the currently mouse-click column

```js
mouseClickCol: undefined as number | undefined
```

#### volatile: mouseClickRow

the currently mouse-click row

```js
mouseClickRow: undefined as number | undefined
```

#### volatile: mouseCol

the currently mouse-hovered column

```js
mouseCol: undefined as number | undefined
```

#### volatile: mouseRow

the currently mouse-hovered row

```js
mouseRow: undefined as number | undefined
```

#### volatile: resetCount

bumped by reset(). The error boundary above the view uses it as its key, since
the boundary keeps its caught error until remounted

```js
resetCount: 0
```

#### volatile: resizeHandleWidth

thickness of the dividers, between the tree and the alignment and under the
view, px

```js
resizeHandleWidth: 5
```

#### volatile: settingsOpen

whether the settings panel docks beside the alignment, taking
`settingsPanelWidth` out of the width the view lays out in

```js
settingsOpen: false
```

#### volatile: status

```js
status: undefined as { msg: string; onCancel?: () => void } | undefined
```

#### volatile: transientHighlights

transient highlights keyed by owner, so a structure viewer's hover and a genome
view's hover each clear only their own. Not persisted.

```js
transientHighlights: {} as Record<string, Highlight[]>
```

#### volatile: volatileWidth

```js
volatileWidth: undefined as number | undefined
```

#### volatile: zoomHeld

the log scale a wheel zoom has gathered against the detent at the default column
width and row height, per axis

```js
zoomHeld: { col: 0, row: 0 }
```

#### volatile: zoomSnapshot

the cell size and block grid the alignment last drew at, held from a wheel-zoom
frame until the gesture settles. MSACanvas stretches those blocks to the current
cell size with one CSS transform

```js
zoomSnapshot: undefined as ZoomSnapshot | undefined
```

### MsaView - Getters

#### getter: activeHiddenCategories

the values `hiddenCategories` hides, by table and field, for the fields an
ordinal or identity scale in that table reads

```js
activeHiddenCategories: HiddenValues
```

#### getter: actuallyShowDomains

```js
actuallyShowDomains: boolean
```

#### getter: adapterTrackModels

```js
adapterTrackModels: BasicTrack[]
```

#### getter: alignmentNames

```js
alignmentNames: string[]
```

#### getter: allAnnotations

the annotations the overlay, the legend and the encodings draw: the GFF's, the
`features` layer's, then the file's own per-row lines

```js
allAnnotations: Annotation[]
```

#### getter: allBranchesLength0

```js
allBranchesLength0: boolean
```

#### getter: alphabetMaxBits

The information content of a fully conserved column, in bits, which depends on
the alphabet. Both the entropy ceiling `conservation` normalizes against and the
y-axis ceiling of the sequence logo track.

```js
alphabetMaxBits: number
```

#### getter: arrangedHierarchy

`arrangedTree` as a hierarchy, every clade expanded and none in focus, which the
facet bands resolve against

```js
arrangedHierarchy: HierarchyNode<NodeWithIds>
```

#### getter: arrangedTree

the tree the rows follow: `filteredTree`, with the rows of a file with no tree
put in `rowTransform`'s sort and facet order. A filter keeping no row is left
unapplied, and `dataWarnings` names it.

```js
arrangedTree: NodeWithIds
```

#### getter: basePairTrackModels

the consensus secondary structure as a track, when there is one. A separate
getter keeps the object stable across zoom, so its canvas does not redraw

```js
basePairTrackModels: BasicTrack[]
```

#### getter: blanks

the hidden columns, ascending: the gappy ones `hideGaps` hides and those outside
the selection `trimToSelection` hides. Every conversion between file and visible
columns reads this one list.

```js
blanks: number[]
```

#### getter: blocks2d

```js
blocks2d: (readonly [number, number])[]
```

#### getter: blocksX

```js
blocksX: number[]
```

#### getter: blocksY

```js
blocksY: number[]
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
branchColors: Map<string, string> | undefined
```

#### getter: categoricalDomainTypes

categorical feature types (InterPro domains and the like) that each get their
own color and a legend entry

```js
categoricalDomainTypes: Annotation[]
```

#### getter: categoryFields

the fields each ordinal or identity scale reads, keyed by declaration as
`resolvedScales` is: a click on a row of its legend hides that value in every
one of them

```js
categoryFields: Map<string, string[]>
```

#### getter: cellFill

what colors the alignment's cells: the residue scheme, the domains covering
them, or nothing, which leaves the scheme to the letters. Domains own the fill
only while some are drawn, so a file whose annotations all start hidden keeps
its residue colors

```js
cellFill: 'domain' | 'none' | 'residue'
```

#### getter: cladeGutterWidth

the pixel column reserved at the right of the tree area for the bracket mark,
which the tip labels and the tree itself stay clear of. Zero where no clade
draws a bar or a label.

```js
cladeGutterWidth: number
```

#### getter: clickedCell

the cell a click pinned. Public API: MSAViewer's onCellClick reports it.

```js
clickedCell: Cell | undefined
```

#### getter: colClustalX

Pre-computed ClustalX colors per column. Returns a map of letter -> color for
each column. ref http://www.jalview.org/help/html/colourSchemes/clustal.html

```js
colClustalX: (Record < string, string > [])
```

#### getter: colConsensus

Pre-computed consensus letter and percent identity color per column. Used by
percent_identity_dynamic color scheme.

```js
colConsensus: {
  letter: string
  color: string | undefined
}
;[]
```

#### getter: colorEncodings

the encodings feeding a color channel, each read through a scale

```js
colorEncodings: ColorEncoding[]
```

#### getter: colorRecords

every record that reads a field through a color object: each color encoding,
each strip's `fill` and each features panel's `fill`, with where it sits in the
snapshot and the table its field is read from

```js
colorRecords: ColorRecord[]
```

#### getter: colorScheme

```js
colorScheme: Record<string, string>
```

#### getter: colSimilarity

Pre-computed similarity shades per column, for blosum62_dynamic. Returns a map
of letter -> color for each column. Amino acids shade by BLOSUM62 similarity to
the rest of the column, and an alignment of nucleotides by identity, since the
matrix names amino acids.

```js
colSimilarity: (Record < string, string > [])
```

#### getter: colStats

```js
colStats: ColumnCounts
```

#### getter: columns

```js
columns: Map<string, string>
```

#### getter: columns2d

```js
columns2d: string[]
```

#### getter: columnTrackContent

a data track's values, string, arcs or spans, projected from its row's residues
onto alignment columns when it names a row, and onto the visible columns when
gappy ones are hidden

```js
columnTrackContent: Map<string, { values?: number[] | undefined; data?: string | undefined; arcs?: Arc[] | undefined; spans?: ColumnSpan[] | undefined; }>
```

#### getter: columnTrackModels

```js
columnTrackModels: BasicTrack[]
```

#### getter: computedTrackModels

the tracks computed from the alignment; they depend on their heights and the
alphabet, not on zoom

```js
computedTrackModels: BasicTrack[]
```

#### getter: conservation

Conservation score per column using Shannon entropy (biojs-msa style).
Conservation = (1 - H/Hmax) * (1 - gapFraction) Returns values 0-1 where 1 =
fully conserved, 0 = no conservation.

```js
conservation: number[]
```

#### getter: dataInitialized

```js
dataInitialized: boolean
```

#### getter: dataWarnings

warnings that follow from the loaded data and clear when it changes. A GFF whose
first column names rows of some other alignment parses without error and draws
nothing

```js
dataWarnings: string[]
```

#### getter: domainBands

every filtered-on annotation resolved to the visible column span it is drawn
across, keyed by row name. Each row is ordered longest-first so a nested short
domain draws on top, and each band carries the lane the sub-row layout puts it
in. Resolved once here instead of per canvas block per redraw; the letter
renderer also reads the band colors to pick legible letter colors.

```js
domainBands: Map<string, DomainBand[]>
```

#### getter: domainBandsByStart

the same bands ordered by start column, for left-to-right sweeps (the letter
renderer walks columns and needs the band covering each one)

```js
domainBandsByStart: Map<string, DomainBand[]>
```

#### getter: domainLegendItems

the legend items of the accession palette, for the overlay and a features panel
that names no color scale

```js
domainLegendItems: LegendItem[]
```

#### getter: domainUnderline

whether the overlay marks each domain with a bar under its row instead of
filling the row behind the letters: whenever the domains do not own the cell
fill (`cellFill`), a filled box would paint over the residue colors the user
picked. Sub-row layout already stacks the boxes clear of the letters, and with
the letters too small to draw the filled box is the only thing left to read.

```js
domainUnderline: boolean
```

#### getter: dynamicColorSchemeName

the scheme coloring each cell from its column's statistics, or undefined while
the cells take a fixed color per letter, from the built-in table or from
`customColorScheme`

```js
dynamicColorSchemeName: string | undefined
```

#### getter: effectiveHeight

availableHeight where a host fills its container, height otherwise

```js
effectiveHeight: number
```

#### getter: effectiveTreeAreaWidth

the width of the area the tree and its labels draw in, px: treeAreaWidth where
set, the fit otherwise

```js
effectiveTreeAreaWidth: number
```

#### getter: effectiveTreeWidth

the width of the tree, px: treeWidth where set, otherwise the tree area less the
label column, which a zoom hiding the labels gives to the tree

```js
effectiveTreeWidth: number
```

#### getter: facetBandsNotClades

the labels of the facet bands whose rows are not one clade of the filtered tree,
which draw no bracket

```js
facetBandsNotClades: string[]
```

#### getter: facetClades

one `bracket` clade per band of `rowTransform.facet`. Under a tree a band names
its tips, and draws only where they are one clade of the filtered tree; without
one, the rows stack by band, and a band names its first and last row.

```js
facetClades: Clade[]
```

#### getter: featureAlignShifts

the shift an `align` transform gives each row, keyed by the feature name it
aligns on: the offset putting the first feature of that name at zero. A row
carrying no such feature is absent, and keeps its own origin.

```js
featureAlignShifts: Map<string, Map<string, number>>
```

#### getter: featureColors

the fill and outline of every feature's span: its own GFF `color=` first, then
the `featureFill` scale, then the accession palette. Computed once per change of
the features, the encodings or the palette

```js
featureColors: Map<Annotation, { fill: string; stroke: string; }>
```

#### getter: featureFillEncoding

the encoding coloring the overlay's spans, undefined when none does, which
leaves each span the color its accession takes in `fillPalette`

```js
featureFillEncoding: ResolvedEncoding | undefined
```

#### getter: featureLabels

the text the `featureLabel` channel draws inside each span, undefined when no
encoding names the channel. A data channel, so it draws whether or not the
residue letters do

```js
featureLabels: Map<Annotation, string> | undefined
```

#### getter: featureTrackScales

each features track's fill and label per span, keyed by track id: a span's own
`color` first, then the `fill` scale over one of its fields, then the track's
`color`. Reads no cell size or hidden column, so a zoom or a gap toggle reuses
it.

```js
featureTrackScales: Map<string, { readonly colors: Map<Annotation, { fill: string; stroke: string; }>; readonly labels: Map<Annotation, string> | undefined; readonly scale: SharedScale | undefined; }>
```

#### getter: fillPalette

accession -> fill: segments alternate two shades, a domain takes a mid-light
color and a site a dark one, so a site's residues stand out on the domain around
them

```js
fillPalette: { [x: string]: string; }
```

#### getter: filteredAnnotations

the annotations drawn: those the filter dialog leaves on, less those carrying a
value a legend click hid

```js
filteredAnnotations: Annotation[]
```

#### getter: filteredTree

`tree` pruned to the tips `rowTransform.filter` keeps, the whole tree where no
filter is set, and undefined where the filter keeps no tip

```js
filteredTree: NodeWithIds | undefined
```

#### getter: fittedTreeAreaWidth

the tree area width while treeAreaWidth is undefined: the label column beside a
tree that widens with its depth, up to maxTreeAreaShare of the view, or the room
the row panels leave where there is no alignment. Where that binds, the tree
keeps minTreeWidth and the renderer ellipsizes the labels

```js
fittedTreeAreaWidth: number
```

#### getter: fontSize

```js
fontSize: number
```

#### getter: gappyColumns

the columns `hideGaps` hides, ascending

```js
gappyColumns: number[]
```

#### getter: header

```js
header: Record<…> | { info: string; version: string | undefined; } | { General: Record<string, string[]>; Accessions: { [k: string]: string; }; Dbxref: { [k: string]: string; }; }
```

#### getter: hideGapsEffective

hideGaps takes effect when a collapse or a focus hides rows, whose residues
leave columns all gaps among the rest, or when allowedGappyness is under 100

```js
hideGapsEffective: boolean
```

#### getter: hierarchy

the laid-out tree, with pixel positions on every node

```js
hierarchy: HierarchyNode<NodeWithIds>
```

#### getter: highlightedColumnRuns

contiguous runs of `highlightedColumns`, so a run of highlighted columns draws
as one bordered band. Memoized because the overlay canvas redraws on every mouse
move.

```js
highlightedColumnRuns: {
  start: number
  end: number
}
;[]
```

#### getter: highlightTrackModels

the column-span highlights as labeled brackets, last so they sit against the
alignment their bands cross

```js
highlightTrackModels: BasicTrack[]
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
hostRestoresData: boolean
```

#### getter: hoveredCell

the cell under the pointer. Public API: MSAViewer's onCellHover reports it.

```js
hoveredCell: Cell | undefined
```

#### getter: hoveredInsertion

Returns insertion info if mouse is hovering over an insertion indicator

```js
hoveredInsertion: { rowName: string; col: number; letters: string; } | undefined
```

#### getter: hoveredRowIndices

row indices highlighted by the current tree hover (a hovered internal node
highlights every tip below it). Shared by the tree and MSA overlay canvases, via
the memoized name->index map.

```js
hoveredRowIndices: number[]
```

#### getter: inputTree

the tree the file or the alignment gives, before `treeRoot`

```js
inputTree: NodeWithIds
```

#### getter: insertionPositions

each row's residues in hidden gappy columns, as the visible column they fall
before and the letters. The columns a trim hides mark no insertion.

```js
insertionPositions: Map<string, { pos: number; letters: string; }[]>
```

#### getter: isLoading

```js
isLoading: boolean
```

#### getter: labelColumnWidth

the px the tip labels take across the tree area: the widest label at
labelFitFontSize and the gaps either side of it, or 0 with drawLabels off

```js
labelColumnWidth: number
```

#### getter: leaves

```js
leaves: HierarchyNode < NodeWithIds > []
```

#### getter: legends

the color keys drawn for this view, one section per scale, shared by the
on-screen legend overlay and the SVG export's reserved column. The domain
overlay produces the first, listing the `featureFill` scale where an encoding
names one. Every scale a row-table encoding, a row panel or a shown features
track reads produces one more, keyed by its declaration, so two channels or two
strips declaring one scale list it once, and strips over eight fields naming one
`legend.title` list one legend between them. A section's note is the first of
its records' `scaleProblems`, else the scale's own note.

```js
legends: LegendSection[]
```

#### getter: mappedStructures

the structures with usable mappings. A row can map onto several, such as an
experimental entry and a predicted model.

```js
mappedStructures: {
  row: string
  structure: MappedStructure
}
;[]
```

#### getter: maxDepthToLeaf

max topological depth to a tip, used to scale cladogram x-positions

```js
maxDepthToLeaf: number
```

#### getter: maxScrollX

most-negative allowed scrollX, which keeps the last column in view

```js
maxScrollX: number
```

#### getter: maxScrollY

most-negative allowed scrollY, which keeps the last row in view

```js
maxScrollY: number
```

#### getter: maxTipLabelWidth

the widest tip label at labelFitFontSize, measured whether or not a zoom hides
the labels

```js
maxTipLabelWidth: number
```

#### getter: mouseOverDomains

domain annotations under the mouse, hit-tested against the exact visible column
span each box is drawn at (so it matches the overlay across gaps)

```js
mouseOverDomains: Annotation[]
```

#### getter: mouseOverHighlights

the column-span highlights over the hovered cell of the alignment

```js
mouseOverHighlights: ResolvedHighlight[]
```

#### getter: mouseOverRowName

```js
mouseOverRowName: string | undefined
```

#### getter: MSA

```js
MSA: MSAParserType | null
```

#### getter: msaAreaHeight

the vertical space for alignment rows: the widget height less the header, the
top band and the tracks. Shared by blocksY, maxScrollY, the vertical scrollbar
and fitVertically.

```js
msaAreaHeight: number
```

#### getter: msaAreaWidth

widget width minus the tree area and the row panels gives the space for the MSA

```js
msaAreaWidth: number
```

#### getter: msaCanvasWidth

width of the alignment canvas: the msa area less the vertical scrollbar.
showHorizontalScrollbar must not read it, since that feeds msaAreaHeight ->
showVerticalScrollbar and would form a cycle

```js
msaCanvasWidth: number
```

#### getter: nodePointColors

the fill the `nodePoint` channel gives each internal node's bubble, by node id,
or undefined when no encoding names the channel. A node with no label, or one
whose value the scale gives no color, keeps the plain bubble. The pass runs over
the whole tree, so a collapsed or focused clade keeps its colors.

```js
nodePointColors: Map<string, string> | undefined
```

#### getter: noTree

```js
noTree: boolean
```

#### getter: numColumns

```js
numColumns: number
```

#### getter: numRows

number of rows on screen: the leaf count, which includes tree leaves with no
matching MSA row (drawn blank), unlike `rows.length`.

```js
numRows: number
```

#### getter: propertyConservation

Per-column conservation of physicochemical property class (amino acids only).
Surfaces conservative-substitution sites that identity-based conservation
misses. Empty for nucleotide alignments.

```js
propertyConservation: number[]
```

#### getter: pxPerBranchLength

pixels per unit of branch length in the phylogram layout, 0 in cladogram mode.
The tree's scale bar uses it.

```js
pxPerBranchLength: number
```

#### getter: referenceRowIndex

row index of the reference row (`relativeTo`), undefined when unset

```js
referenceRowIndex: number | undefined
```

#### getter: referenceTrackModels

the reference row (`relativeTo`) repeated above the alignment, so it stays in
view while the rows compared against it scroll

```js
referenceTrackModels: BasicTrack[]
```

#### getter: residueMappingProblems

why each ignored residue mapping is ignored, so a host can tell a missing
structure from a mapping made against a different alignment.

```js
residueMappingProblems: ResidueMappingProblem[]
```

#### getter: resolvedClades

`clades` resolved to the rows each one covers. The tip names resolve against
`tree` rather than `root`, so a clade whose ancestor the user collapsed keeps
its rows. One leaf pass over the tree serves every clade. A `range` record names
no node, so `collapse`, `focus` and `rotate`, which need one, drop it. The
`facetClades` brackets follow, resolved against `arrangedTree`.

```js
resolvedClades: ResolvedClade[]
```

#### getter: resolvedEncodings

each encoding with its scale resolved against the values its field takes: a
feature channel reads them across every feature loaded, every other channel
across the row table. Resolved once per change of that table or the encodings,
never per row per frame.

```js
resolvedEncodings: ResolvedEncoding[]
```

#### getter: resolvedHighlights

`highlights` projected onto what is on screen: residue spans go through the
named row's gap structure, column spans through the hidden-column list, and a
span that lands entirely on hidden columns is dropped. Row names that match no
row are ignored.

```js
resolvedHighlights: ResolvedHighlight[]
```

#### getter: resolvedRowPanels

each row panel with its scale from `rowPanelScales` and its geometry: the pixel
column it draws in and, for a features panel, the spans per row. Resolved once
per change of those inputs, never per block per frame.

```js
resolvedRowPanels: ResolvedRowPanel[]
```

#### getter: resolvedScales

every color object the encodings and the row panels declare, keyed by
declaration (`declarationKey`) and resolved once over the union of the values
its records' fields take, so a value two strips share takes one color in both. A
feature field reads every feature loaded, so hiding a type in the filter dialog
leaves the rest in their colors, and its legend lists the values of the drawn
features.

```js
resolvedScales: Map<string, SharedScale>
```

#### getter: resolvedSelection

`selection` projected onto what is on screen, the way `resolvedHighlights`
projects a column span and a row set. A selection whose columns are all hidden,
or whose rows are all collapsed away or unknown, resolves to undefined.

```js
resolvedSelection: ResolvedSelection | undefined
```

#### getter: root

```js
root: HierarchyNode<NodeWithIds>
```

#### getter: rootToTipLength

branch-length extent of the displayed tree, root to farthest tip, in the tree's
own units

```js
rootToTipLength: number
```

#### getter: rowData

the row table: extra fields per row, keyed by row name, which the `encodings`
channels read. It is stored as the JSON string `data.treeMetadata`, the name
that travels in existing links, so the inline size limit and
`treeMetadataFilehandle` cover it. The tree area fit reads it on every layout,
so a malformed user-supplied file returns {} instead of throwing out of
rendering, and every field is a string by the time a scale sorts it.

```js
rowData: Record<string, Record<string, string> | undefined>
```

#### getter: rowFields

the field names the row table carries, sorted, for a producer or a UI choosing
one to encode

```js
rowFields: string[]
```

#### getter: rowLabelField

the `rowData` field drawn as each tip's label: the one a `rowLabel` encoding
names, else `genome`

```js
rowLabelField: string
```

#### getter: rowMap

every sequence in the alignment, keyed by the alignment's own row names,
including rows a collapsed clade hides

```js
rowMap: Map<string, string>
```

#### getter: rowNames

Returns the list of row (sequence) names in display order. Part of the public
API used by downstream consumers (e.g. jbrowse plugins).

```js
rowNames: string[]
```

#### getter: rowNamesSet

```js
rowNamesSet: Map<string, number>
```

#### getter: rowPanelScales

each row panel's scale resolved against the values its field takes, giving the
colors, labels and legend entries. Reads no cell size, so a zoom reuses it and
the legends built from it.

```js
rowPanelScales: (StripPanelScale | FeaturePanelScale)[]
```

#### getter: rowPanelsHeaderHeight

height of the band the row panel headers draw in, which is zero with no row
panels and leaves the top area as it was

```js
rowPanelsHeaderHeight: 0 | 56
```

#### getter: rowPanelsWidth

the pixel column the row panels occupy between the tree and the alignment, the
sum of each record's width

```js
rowPanelsWidth: number
```

#### getter: rows

```js
rows: [string, string][]
```

#### getter: rowTints

the wash the `rowTint` channel draws over each row, indexed by row, or undefined
when no encoding names the channel. The overlay draws these, so a tint stays out
of the raster tile cache and its keys.

```js
rowTints: (string | undefined)[] | undefined
```

#### getter: rowTransformWarnings

what `rowTransform` asks for and the view does not draw: a filter keeping no
row, a sort under a tree, and facet bands that are not clades of the tree

```js
rowTransformWarnings: string[]
```

#### getter: scaleProblemNotes

the first problem of each declaration's records, keyed as `resolvedScales` is,
for its legend section's note

```js
scaleProblemNotes: Map<string, string>
```

#### getter: scaleProblems

why a record's color object draws other than it says, per record: a `domainMax`
below its `domainMin`, a threshold whose cuts are unsorted or whose `range` is
not one longer, a `domainQuantile` outside 0.5 to 1, `labels` of the wrong
length, a `scheme` no table holds. The viewer draws what it can, and the scale's
legend notes the first problem.

```js
scaleProblems: RecordScaleProblem[]
```

#### getter: secondaryStructureArcs

the base pairs of the consensus secondary structure, as arcs, in visible column
space. The full string is parsed so hidden columns keep their partners, and an
end in a hidden column moves to its visible neighbor, as a column track's arc
does. A pair whose ends meet once the columns between them are hidden draws
nothing

```js
secondaryStructureArcs: Arc[] | undefined
```

#### getter: secondaryStructureConsensus

```js
secondaryStructureConsensus: string | undefined
```

#### getter: segmentDomainTypes

ordinal segment types (exons etc.), ordered by sequence position so
exon-1..exon-14 run left-to-right; colored by alternating shade and labeled by
number, with no legend row

```js
segmentDomainTypes: Annotation[]
```

#### getter: segmentLabels

accession -> number drawn on each segment band: the trailing number of the
feature name ("exon-3" -> "3"), else its 1-based position

```js
segmentLabels: Map<string, string>
```

#### getter: selectionFasta

the selected block as FASTA: the selected rows on screen, top to bottom, each
with its letters across the file's columns from `start` to `end`, gaps included

```js
selectionFasta: string
```

#### getter: selectionFileSpan

`selection`'s columns clamped to the file's

```js
selectionFileSpan: { start: number; end: number; } | undefined
```

#### getter: selectionSize

the columns and rows the selection covers, for the header's readout. Columns
count the file's columns from `start` to `end`, hidden ones included, as
`selectionFasta` copies them.

```js
selectionSize: { columns: number; rows: number; } | undefined
```

#### getter: sequenceType

Detects sequence type based on letters present in the alignment. Returns 'dna',
'rna', or 'amino'. Hidden columns count, so trimming to a few columns keeps the
type.

```js
sequenceType: 'amino' | 'dna' | 'rna'
```

#### getter: showBranchLenEffective

effective showBranchLen accounting for allBranchesLength0

```js
showBranchLenEffective: boolean
```

#### getter: showHorizontalScrollbar

```js
showHorizontalScrollbar: boolean
```

#### getter: showMsaLetters

```js
showMsaLetters: boolean
```

#### getter: showTreeText

```js
showTreeText: boolean
```

#### getter: showVerticalScrollbar

```js
showVerticalScrollbar: boolean
```

#### getter: tipLabelColors

the color the `tipLabel` channel gives each row, by row name. Undefined when no
encoding names the channel, which leaves the labels the theme's text color.

```js
tipLabelColors: Map<string, string> | undefined
```

#### getter: topBandHeight

the band across the top: the minimap over the alignment, the row panel headers,
and the tree overview stacked on the scale bar, as tall as the tallest of the
three

```js
topBandHeight: number
```

#### getter: totalHeight

```js
totalHeight: number
```

#### getter: totalTrackAreaHeight

total height of track area (px)

```js
totalTrackAreaHeight: number
```

#### getter: totalWidth

```js
totalWidth: number
```

#### getter: tree

the tree as the file or the alignment gives it, rerooted where `treeRoot` asks.
Every node id, and so `collapsed`, `rotated` and `showOnly`, refers to this
tree.

```js
tree: NodeWithIds
```

#### getter: treeAreaWidthMinusMargin

the right edge the tip labels end at, which is the tree area less the margin and
the bracket gutter

```js
treeAreaWidthMinusMargin: number
```

#### getter: treeDrawn

whether a tree draws beside the labels: false for a file with no tree, and with
drawTree off

```js
treeDrawn: boolean
```

#### getter: treeHierarchy

the whole tree as a hierarchy, every clade expanded and none in focus, which the
clade marks resolve against

```js
treeHierarchy: HierarchyNode<NodeWithIds>
```

#### getter: treeLayout

`root` laid out on new nodes in row and branch-length units, read in pixels
through `rowHeight` and `effectiveTreeWidth`. A zoom leaves it and every node in
it as they are, and an observer reading a node's `x` or `len` observes the size
it scales by.

```js
treeLayout: { root: LaidOutNode<NodeWithIds>; leaves: LaidOutNode<NodeWithIds>[]; rootToTipLength: number; }
```

#### getter: treeNewick

the tree as Newick in the order and with the root it is drawn, with every clade,
collapsed or out of focus

```js
treeNewick: string
```

#### getter: treeOverviewClades

the `clades` highlights in the overview's own row space, which the focus does
not narrow

```js
treeOverviewClades: ResolvedClade[]
```

#### getter: treeOverviewFocusRows

the inclusive tip rows the focused subtree covers in the overview, which is the
box drawn on it. undefined with no focus

```js
treeOverviewFocusRows: [number, number] | undefined
```

#### getter: treeOverviewHeight

height of the band the tree overview draws in, zero when it is off

```js
treeOverviewHeight: number
```

#### getter: treeOverviewLayout

the whole tree laid out for the overview, or undefined when the overview is off.
The focus is left out, so the focused subtree draws inside the whole tree, and
the collapsed clades are folded, since those are rows the view no longer has.
`x` is in tip-index space and `len` is a fraction of the root-to-tip length, so
one layout serves any band size.

```js
treeOverviewLayout: { root: LaidOutNode<NodeWithIds>; numTips: number; maxDepthToLeaf: number; showBranchLen: boolean; } | undefined
```

#### getter: treeScaleBar

the branch-length scale bar over the tree, the guide of its branch-length scale:
undefined in cladogram mode, with the tree off, or when the tree area is too
narrow for one

```js
treeScaleBar: { step: number; px: number; label: string; } | undefined
```

#### getter: treeTips

the leaf names of the whole tree and its depth in levels. The fit reads these,
so a collapse or a focus leaves the tree area as it is

```js
treeTips: { names: string[]; depth: number; }
```

#### getter: trimSpan

the file columns `trimToSelection` keeps, or undefined while it keeps every
column

```js
trimSpan: { start: number; end: number; } | undefined
```

#### getter: turnedOnTracks

```js
turnedOnTracks: BasicTrack[]
```

#### getter: typeFilteredAnnotations

the annotations the filter dialog leaves on

```js
typeFilteredAnnotations: Annotation[]
```

#### getter: unshareableData

loaded documents left out of the snapshot, largest first. A file opened from
disk or pasted in becomes inline text, and DataModel drops an inline document
past `maxInlineSnapshotBytes`.

The standalone app drops `#data=` from the address bar while the list is
non-empty or the encoded link would pass its `maxLinkLength`, so a copied link
never opens an empty viewer unannounced. A document fetched from a URL never
appears here, since the snapshot keeps its filehandle.

Empty when `hostCarriesData` is true.

```js
unshareableData: UnshareableData[]
```

#### getter: usableResidueMappings

the mappings that fit the loaded alignment. A row-level problem drops the whole
mapping; a malformed segment drops only that segment.

```js
usableResidueMappings: ResidueMapping[]
```

#### getter: verticalScrollbarWidth

```js
verticalScrollbarWidth: 0 | 20
```

#### getter: viewport

the columns on screen. Public API: MSAViewer's onViewportChange reports it.

```js
viewport: Viewport | undefined
```

#### getter: visibleDomainTypes

the domain types currently drawn on the alignment (filtered-on), shared by the
on-screen legend and the SVG export legend: the categorical types ordered by
sequence position. Ordinal segments (exons) are numbered on the band instead

```js
visibleDomainTypes: Annotation[]
```

#### getter: warnings

the load warnings and the undismissed data warnings, for the header

```js
warnings: string[]
```

#### getter: wheelZoomAxis

axis a wheel zoom scales, for ctrl+wheel as much as for scroll-zoom. With
scroll-zoom off the toolbar shows no axis, so ctrl+wheel takes both.

```js
wheelZoomAxis: 'both' | 'horizontal' | 'vertical'
```

#### getter: wheelZooming

```js
wheelZooming: boolean
```

#### getter: width

```js
width: number
```

### MsaView - Methods

#### method: annotationHidden

whether a feature carries a value the reader hid

```js
annotationHidden: (annotation: Annotation) => boolean
```

#### method: cellAt

the cell at a visible column and row index, in the coordinates a host writes
highlights in. On a gap `residue` is undefined and `letter` is the gap character

```js
cellAt: (visibleCol: number, rowIndex?: number | undefined) => Cell
```

#### method: columnStatsAt

per-column summary statistics: consensus residue and its identity fraction, both
conservation scores, gap fraction, and the sorted non-gap residue distribution.
undefined past the end of the alignment or for an all-gap column.

```js
columnStatsAt: (col: number) => ColumnStats | undefined
```

#### method: columnTrackModel

the track a column track spec draws as, computed once per spec. A text track's
height falls through to rowHeight, and its own computed confines the vertical
zoom to it, so a sibling keeps its object and its canvas skips the redraw

```js
columnTrackModel: (track: ColumnTrackSpec) => BasicTrack
```

#### method: encodingFor

the encoding feeding a channel, undefined when none does

```js
encodingFor: (channel: ColorEncodingChannel) => ResolvedEncoding | undefined
```

#### method: featureOff

```js
featureOff: (accession: string) => boolean
```

#### method: fillHighlightLabel

a highlight label with `{residue}` and `{position}` filled in from the row's
letter at `start`, which is how the `175` shorthand draws "R175"

```js
fillHighlightLabel: (label: string, row?: string | undefined, start?: number | undefined) => string
```

#### method: getRowData

```js
getRowData: (name: string) => { data: { name?: string | undefined; accession?: string | undefined; dbxref?: string | undefined; } | undefined; rowData: Record<string, string> | undefined; }
```

#### method: globalColToVisibleCol

Convert a global column index to a visible column index. Returns undefined if
the column is hidden (in blanks). This is the inverse of visibleColToGlobalCol.

```js
globalColToVisibleCol: (globalCol: number) => number | undefined
```

#### method: rowDataOf

one row's fields, the single reader of the row table

```js
rowDataOf: (name: string) => Record<string, string> | undefined
```

#### method: rowLabelOf

the text a row's tip label draws: its `rowLabelField` value, else the row name

```js
rowLabelOf: (name: string) => string
```

#### method: rowResidue

The row residue for a structure residue; the inverse of `structureResidue`,
returning undefined in the same cases. `asymId` picks a chain when several
mappings share an entry id, as in a homodimer.

```js
rowResidue: (structureId: string, position: number, asymId?: string | undefined) => RowResidue | undefined
```

#### method: rowSequence

the row's aligned sequence by the name the tree gives it, including rows a
collapsed clade hides. `MSA.getRow` resolves a FASTA name whose colon a Newick
tool wrote as an underscore, which `rowMap` does not

```js
rowSequence: (name: string) => string | undefined
```

#### method: scaleOf

the shared scale a record's color object resolves to

```js
scaleOf: (channel: ColorChannel, table: ScaleTable) => SharedScale
```

#### method: seqEndToGlobalCol

the global column of a span's last residue, clamping a position past the end of
the row to its last residue. Undefined for a row name the alignment does not
have, or a row with no residues.

```js
seqEndToGlobalCol: (rowName: string, seqPos: number) => number | undefined
```

#### method: seqPosIndex

index of the global column holding each ungapped sequence position of a row. The
domain overlay resolves thousands of these per redraw. Built lazily per row and
cached on the parse.

```js
seqPosIndex: (rowName: string) => Int32Array<ArrayBufferLike> | undefined
```

#### method: seqPosToGlobalCol

Convert a sequence position (ungapped) to a global column index. Returns
undefined for a row name the alignment does not have.

```js
seqPosToGlobalCol: (rowName: string, seqPos: number) => number | undefined
```

#### method: seqPosToVisibleCol

Convert a sequence position (ungapped) directly to a visible column index. This
combines seqPosToGlobalCol and globalColToVisibleCol.

```js
seqPosToVisibleCol: (rowName: string, seqPos: number) => number | undefined
```

#### method: structureResidue

The structure residue for a row residue. Returns undefined when no segment
covers `seqPos`, or when the row maps onto several structures and `structureId`
does not pick one (see `mappedStructures`).

Positions are 1-based, like `residueMappings` and `highlights`; the column
helpers above are 0-based.

```js
structureResidue: (rowName: string, seqPos: number, structureId?: string | undefined) => StructureResidue | undefined
```

#### method: trackHeight

the height a track draws at: what the user dragged its divider to, then the
height its snapshot asked for, then its kind's default. Only a text track falls
through to rowHeight

```js
trackHeight: (kind: TrackKind, heightKey?: string, given?: number | undefined) => number
```

#### method: treeOverviewHit

the subtree a point `y` pixels down the tree overview picks: the deepest one
whose tip range covers every row under that pixel, with the rows it covers. A
pixel stands for several tips on a large tree, which is what keeps the pick off
the individual tips. undefined when the overview is off or the point picks the
whole tree.

```js
treeOverviewHit: (y: number) => { id: string; rows: [number, number]; } | undefined
```

#### method: visibleColToGlobalCol

Convert a visible column index (what a mouse handler reports) to a column of the
full alignment. A host indexing its own per-column data needs this when columns
are hidden.

```js
visibleColToGlobalCol: (visibleCol: number) => number
```

#### method: visibleColToRowLetter

Return the character a row holds at a visible column: a residue, or the gap
character (`-` or `.`) on a gap. Undefined for a row name the alignment does not
have or a column past the row's end.

```js
visibleColToRowLetter: (rowName: string, visibleCol: number) => string | undefined
```

#### method: visibleColToSeqPos

Convert a visible column to a row-specific sequence position (0-based). Returns
undefined if the position is a gap in the sequence.

Public API, like the sibling converters (visibleColToGlobalCol,
seqPosToVisibleCol, globalColToVisibleCol, seqPosToGlobalCol) hosts use to
translate between columns and residue positions. Keep them stable.

```js
visibleColToSeqPos: (rowName: string, visibleCol: number) => number | undefined
```

#### method: visibleColToSeqPosOneBased

Convert a visible column to a row-specific sequence position (1-based). Returns
undefined if the position is a gap in the sequence.

```js
visibleColToSeqPosOneBased: (rowName: string, visibleCol: number) => number | undefined
```

#### method: visibleSpan

the visible columns a span covers, in highlight coordinates: `start` and `end`
are 1-based residues of `row`, or columns of the file without it. A fractional
position, as a zoom gesture reports one, widens to the whole residue or column
it falls in. A span entirely on hidden columns, or naming a row the alignment
lacks, gives undefined.

```js
visibleSpan: ({ row, start: rawStart, end: rawEnd }: Region) => { startCol: number; endCol: number; } | undefined
```

### MsaView - Actions

#### action: addWarning

record a non-fatal load problem: a layer that failed to load, a file that failed
to parse. A message already on the list is not added again

```js
addWarning: (warning: string) => void
```

#### action: applyGFFText

parse GFF3, or an InterProScan JSON response, into the annotations

```js
applyGFFText: (gffText: string) => void
```

#### action: applyHighlight

show `highlights` for `owner`, replacing that owner's previous ones and leaving
other owners' in place

```js
applyHighlight: (owner: string, highlights: Highlight[]) => void
```

#### action: calculateNeighborJoiningTreeFromMSA

Calculate a neighbor joining tree from the current MSA using BLOSUM62 distances.
Throws above `maxNeighborJoiningRows`: the join loop is cubic and runs on the
main thread, and 800 rows freeze the tab for ten seconds with no cancel.

```js
calculateNeighborJoiningTreeFromMSA: () => void
```

#### action: clearHighlight

remove `owner`'s highlights, leaving other owners' in place

```js
clearHighlight: (owner: string) => void
```

#### action: clearNodeState

forget `collapsed`, `rotated` and `showOnly`, whose path-derived node ids name
other nodes once the tree changes shape, and let the clade marks seed them again

```js
clearNodeState: () => void
```

#### action: clearRotated

```js
clearRotated: () => void
```

#### action: clearSelection

clear the selection, and the trim to it

```js
clearSelection: () => void
```

#### action: clearWarnings

```js
clearWarnings: () => void
```

#### action: doScrollX

```js
doScrollX: (deltaX: number) => void
```

#### action: doScrollY

```js
doScrollY: (deltaY: number) => void
```

#### action: drawRelativeTo

draw the alignment with positions numbered relative to the given row's sequence
(its node id), instead of in raw MSA-column coordinates

```js
drawRelativeTo: (id: string | undefined) => void
```

#### action: endWheelZoom

```js
endWheelZoom: () => void
```

#### action: exportNewick

save `treeNewick` as a file

```js
exportNewick: () => void
```

#### action: exportSVG

```js
exportSVG: (opts: ExportSvgOptions) => Promise<void>
```

#### action: fit

```js
fit: () => void
```

#### action: fitHorizontally

```js
fitHorizontally: (maxColWidth?: number) => void
```

#### action: fitVertically

```js
fitVertically: (maxRowHeight?: number) => void
```

#### action: replaceTree

swap in a different tree over the same alignment, clearing the node state
(`clearNodeState`) and the tree's filehandle

```js
replaceTree: (newick: string) => void
```

#### action: rerootAt

root the tree on the branch above the given node. The node's tips are a split of
the unrooted tree, and the side of it that is a clade in the tree as written
stands for it as an outgroup, by its first and last tip, so the root survives
the path ids changing under it

```js
rerootAt: (nodeId: string) => void
```

#### action: reset

Return to the import form: reset every property not in `preservedOnReset` to its
default, then clear the file-derived volatiles applySnapshot does not touch.

```js
reset: () => void
```

#### action: resetZoom

restore the default column width and row height

```js
resetZoom: () => void
```

#### action: revealRegion

zoomToRegion, and for a region naming a row, also scroll that row to the middle
of the alignment, as Go to does. What `region` opens on; a caller following a
range as it moves wants zoomToRegion alone, which leaves the reader's vertical
scroll where they put it.

```js
revealRegion: (region: Region) => void
```

#### action: seedCladeMarks

apply the `collapse`, `focus` and `rotate` clade marks to the node state. A mark
that resolves to no node, as against the flat stub before a tree loads, leaves
the marks to seed again

```js
seedCladeMarks: () => void
```

#### action: selectBlock

select the block between two cells given as visible column and row indices, the
coordinates a drag reports, clamped to the alignment. A cell with no `row`
selects the columns across every row, and so does a block spanning every row on
screen.

```js
selectBlock: (anchor: { col: number; row?: number | undefined; }, head: { col: number; row?: number | undefined; }) => void
```

#### action: setAllowedGappyness

```js
setAllowedGappyness: (arg: number) => void
```

#### action: setAnnotations

Set the overlay annotations (an empty list clears them). InterProScan, GFF, user
uploads and NCBI CDD all arrive here as Annotation[].

Leaves `showDomains` alone, because a restored snapshot reloads its GFF and must
keep a hidden overlay hidden.

```js
setAnnotations: (annotations: Annotation[]) => void
```

#### action: setAvailableHeight

```js
setAvailableHeight: (height?: number | undefined) => void
```

#### action: setCellFill

hand the cell fill to the residue scheme, the domains, or neither, which colors
the letters instead

```js
setCellFill: (mode: "domain" | "none" | "residue") => void
```

#### action: setClades

replace the clades the viewer marks (see docs/layers.md)

```js
setClades: (clades: Clade[]) => void
```

#### action: setColumnTracks

```js
setColumnTracks: (tracks: ColumnTrackSpec[]) => void
```

#### action: setColWidth

set col width (px)

```js
setColWidth: (n: number) => void
```

#### action: setCurrentAlignment

switch to another alignment of a multi-alignment file (Stockholm). Clears the
collapsed and rotated node ids, the subtree in focus, the reference row and the
scroll position, which all refer to the previous alignment

```js
setCurrentAlignment: (n: number) => void
```

#### action: setData

set the alignment/tree/metadata/domain data directly from strings, bypassing the
filehandle loaders

```js
setData: (data: { msa?: string | undefined; tree?: string | undefined; treeMetadata?: string | undefined; gff?: string | undefined; }) => void
```

#### action: setDomainFill

```js
setDomainFill: (arg: boolean) => void
```

#### action: setDrawMsaLetters

```js
setDrawMsaLetters: (arg: boolean) => void
```

#### action: setEmbeddedMode

```js
setEmbeddedMode: (arg: boolean) => void
```

#### action: setEncodings

replace what the viewer's marks read from the row table

```js
setEncodings: (encodings: Encoding[]) => void
```

#### action: setError

set error state

```js
setError: (error?: unknown) => void
```

#### action: setFeatures

```js
setFeatures: (features: Feature[]) => void
```

#### action: setFilter

show or hide an annotation type. Only a choice that differs from the type's
default is recorded; see `turnedOffFeatures`

```js
setFilter: (accession: string, shown: boolean) => void
```

#### action: setGFF

store the GFF text in the snapshot like the alignment and tree. The parsed
annotations are volatile and a blob filehandle is cleared once read, so the text
is the only persisted copy. An autorun parses it into annotations, and clears
the ones it drew when the text goes. New text drops the filehandle, as setMSA
does

```js
setGFF: (result?: string | undefined) => void
```

#### action: setGFFFilehandle

```js
setGFFFilehandle: (gffFilehandle?: FileLocation | undefined) => void
```

#### action: setHeaderHeight

```js
setHeaderHeight: (arg: number) => void
```

#### action: setHeight

set the height of the view in px

```js
setHeight: (height: number) => void
```

#### action: setHiddenCategories

replace the `{field, value}` pairs the legend hides

```js
setHiddenCategories: (hidden: HiddenCategory[]) => void
```

#### action: setHideGaps

hide columns that are entirely (or mostly, see allowedGappyness) gaps

```js
setHideGaps: (arg: boolean) => void
```

#### action: setHideHeader

```js
setHideHeader: (arg: boolean) => void
```

#### action: setHighlightedColumns

set highlighted columns

Public API: jbrowse-plugin-msaview calls this from its afterCreateAutoruns, and
MSAViewer passes its `highlightColumns` prop through it.

```js
setHighlightedColumns: (columns?: number[] | undefined) => void
```

#### action: setHighlights

```js
setHighlights: (highlights: Highlight[]) => void
```

#### action: setHighResScaleFactor

update the canvas scale factor when the device pixel ratio changes (moving
between monitors, browser zoom)

```js
setHighResScaleFactor: (arg: number) => void
```

#### action: setHostCarriesData

declare that this host restores the loaded documents itself, which keeps
`unshareableData` empty. See `hostCarriesData`

```js
setHostCarriesData: (arg: boolean) => void
```

#### action: setHoveredHighlight

```js
setHoveredHighlight: (key?: string | undefined) => void
```

#### action: setHoveredTreeNode

set hovered tree node and its descendants

```js
setHoveredTreeNode: (nodeId?: string | undefined) => void
```

#### action: setImportForm

```js
setImportForm: (arg: boolean) => void
```

#### action: setLoadingMSA

```js
setLoadingMSA: (arg: boolean) => void
```

#### action: setLoadingTree

```js
setLoadingTree: (arg: boolean) => void
```

#### action: setMouseClickPos

set mouse click position (row, column) in the MSA

```js
setMouseClickPos: (col?: number | undefined, row?: number | undefined) => void
```

#### action: setMousePos

set mouse position (row, column) in the MSA

Public API: a host calls this (and reads `mouseCol`) to sync hover with its own
view, such as a genome view or 3D structure. Keep the name and signature stable.

```js
setMousePos: (col?: number | undefined, row?: number | undefined) => void
```

#### action: setMSA

replace the alignment text and drop its filehandle, so the snapshot carries the
new text

```js
setMSA: (result: string) => void
```

#### action: setMSAFilehandle

```js
setMSAFilehandle: (msaFilehandle?: FileLocation | undefined) => void
```

#### action: setRegion

```js
setRegion: (region?: Region | undefined) => void
```

#### action: setResidueMappings

replace the alignment<->structure correspondence (see docs/layers.md)

```js
setResidueMappings: (mappings: ResidueMapping[]) => void
```

#### action: setRowData

replace the row table, which the model keeps as the JSON string
`data.treeMetadata` (see docs/layers.md)

```js
setRowData: (rowData: RowDataInput) => void
```

#### action: setRowHeight

set row height (px)

```js
setRowHeight: (n: number) => void
```

#### action: setRowPanels

replace the panels drawn between the tree and the alignment

```js
setRowPanels: (panels: RowPanelSpec[]) => void
```

#### action: setRowTransform

replace the row axis's filter, sort and facet

```js
setRowTransform: (transform?: RowTransform | undefined) => void
```

#### action: setScrollX

```js
setScrollX: (n: number) => void
```

#### action: setScrollY

set scroll Y-offset (px), clamped to keep the alignment in view

```js
setScrollY: (n: number) => void
```

#### action: setScrollZoom

```js
setScrollZoom: (arg: boolean) => void
```

#### action: setScrollZoomAxis

```js
setScrollZoomAxis: (arg: "both" | "horizontal" | "vertical") => void
```

#### action: setSelection

select a block, in `selection` coordinates. `start` and `end` may come in either
order.

```js
setSelection: (selection?: MsaSelection | undefined) => void
```

#### action: setSettingsOpen

```js
setSettingsOpen: (arg: boolean) => void
```

#### action: setShowDomainLegend

expand or collapse the domain legend that floats over the alignment

```js
setShowDomainLegend: (arg: boolean) => void
```

#### action: setShowDomains

toggle the annotation overlay on the alignment

```js
setShowDomains: (arg: boolean) => void
```

#### action: setShowOnly

show only the subtree rooted at the given node id (pass undefined to show the
whole tree again)

```js
setShowOnly: (node?: string | undefined) => void
```

#### action: setStatus

```js
setStatus: (status?: { msg: string; onCancel?: (() => void) | undefined; } | undefined) => void
```

#### action: setSubFeatureRows

```js
setSubFeatureRows: (arg: boolean) => void
```

#### action: setTrackHeight

resize every track sharing a `heightKey`; see `trackHeights`

```js
setTrackHeight: (heightKey: string, height: number) => void
```

#### action: setTracksShown

show or hide several tracks at once, as the track selector's Show all and Hide
all do. A choice matching the track's default is dropped, so it stays out of the
shared URL

```js
setTracksShown: (ids: string[], shown: boolean) => void
```

#### action: setTree

replace the tree text and drop its filehandle, as setMSA does

```js
setTree: (result: string) => void
```

#### action: setTreeFilehandle

```js
setTreeFilehandle: (treeFilehandle?: FileLocation | undefined) => void
```

#### action: setTreeMetadata

replace the row table's JSON text and drop its filehandle, as setMSA does

```js
setTreeMetadata: (result: string) => void
```

#### action: setTreeMetadataFilehandle

```js
setTreeMetadataFilehandle: (treeMetadataFilehandle?: FileLocation | undefined) => void
```

#### action: setTreeRoot

reroot the tree, which clears the node state (`clearNodeState`)

```js
setTreeRoot: (treeRoot?: TreeRoot | undefined) => void
```

#### action: setTrimToSelection

```js
setTrimToSelection: (arg: boolean) => void
```

#### action: setWidth

```js
setWidth: (arg: number) => void
```

#### action: toggleCollapsed

collapse or un-collapse the subtree rooted at the given tree node id

```js
toggleCollapsed: (node: string) => void
```

#### action: toggleLegendItem

a click on a legend row: hides the value it keys, or shows it again. A row of
the accession key turns its feature type off or on in the filter dialog's
`turnedOffFeatures`

```js
toggleLegendItem: (hides: LegendHides, value: string) => void
```

#### action: toggleRotated

reverse the order of the given node's children, or restore it

```js
toggleRotated: (node: string) => void
```

#### action: toggleTrack

```js
toggleTrack: (id: string) => void
```

#### action: treeOverviewClick

focus the subtree a click `y` pixels down the tree overview lands on. A click
inside the box already drawn there clears the focus, the way clicking the
focused branch again does.

```js
treeOverviewClick: (y: number) => void
```

#### action: wheelZoomToPos

zoomToPos for one wheel or pinch frame. The alignment keeps the blocks it drew
at the start of the gesture, scaled, and redraws them only once they stop
covering the viewport; endWheelZoom redraws them sharp

```js
wheelZoomToPos: (scaleFactor: number, offsetX: number, offsetY: number) => void
```

#### action: zoomAtCenter

zoom by `scaleFactor` about the center of the alignment area

```js
zoomAtCenter: (scaleFactor: number, axis?: "both" | "horizontal" | "vertical") => void
```

#### action: zoomIn

```js
zoomIn: () => void
```

#### action: zoomOut

```js
zoomOut: () => void
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
zoomToPos: (scaleFactor: number, offsetX: number, offsetY: number, axis?: "both" | "horizontal" | "vertical") => void
```

#### action: zoomToRegion

zoom and scroll so a span fills the alignment's width, in highlight coordinates
(see visibleSpan). Does nothing before the viewer knows its width, or for a span
that resolves to no visible column.

```js
zoomToRegion: (region: Region) => void
```

#### action: zoomToSelection

zoom and scroll so the selected columns fill the alignment's width, and, where
the selection names its rows, so those rows fill its height

```js
zoomToSelection: () => void
```
