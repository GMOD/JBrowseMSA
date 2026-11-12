import type { TreeOrder } from './types.ts'

// Main model defaults
export const defaultRowHeight = 16
export const defaultColWidth = 12
export const defaultHeight = 550
// the dividers' thickness, between the tree and the alignment and under the view
export const resizeHandleWidth = 5
export const defaultScrollX = 0
export const defaultScrollY = 0
export const defaultCurrentAlignment = 0
// Only a hidden overlay is stored, so a link that never mentions it opens
// showing its annotations.
export const defaultShowDomains = true
export const defaultShowDomainLegend = true
export const defaultHideGaps = true
export const defaultAllowedGappyness = 100
export const defaultSubFeatureRows = false
// height of one sub-row when subFeatureRows is on, unless the row has more
// lanes than fit at this height (see renderBoxFeatureCanvasBlock)
export const subFeatureRowHeight = 4
// height of the bar the overlay draws under a row in letter-color mode
export const domainUnderlineHeight = 3

// Feature types that are ordinal segments of one transcript. The overlay
// alternates two shades across them and labels them by number, and every other
// type gets its own color and legend row.
export const segmentFeatureTypes = new Set([
  'exon',
  'CDS',
  'five_prime_UTR',
  'three_prime_UTR',
  'UTR',
  'intron',
])

// the two shades alternated across adjacent segments (exons)
export const segmentShades = ['#9fb6d4', '#d4dcea']

/**
 * A site's feature type: CDD's GenPept `Site`, a Sequence Ontology `*_site`,
 * InterPro's `Binding_site`, `Active_site` and `Conserved_site`, and UniProt's
 * `Binding site`. A site is a set of scattered residues, often single columns
 */
export function isSiteType(featureType: string | undefined) {
  return !!featureType && /(^|[_ ])site$/i.test(featureType)
}

// A domain fills a span the residue letters draw over, so it takes a mid-light
// color, CIELAB L* 70 to 80, dark enough that its ends show against unfilled
// cells. A site marks a few residues inside a domain, so it takes a dark one,
// L* 45 or less: a thin mark needs lightness contrast to show on a fill, and
// hue alone gives none. Neither list holds a grey or a magenta, which a
// structure view draws for uncolored chains and for the hovered residue
export const domainFills = [
  '#8fb3d9',
  '#f2b277',
  '#9fd18f',
  '#c3a5d9',
  '#ee9f9f',
  '#d4c08f',
  '#8fd1cb',
]
export const siteFills = ['#0f6e52', '#a84a00', '#5a54a0', '#3f6b12', '#7a5514']
export const defaultDrawMsaLetters = true
export const defaultScrollZoom = false

// Which cell dimensions a wheel zoom scales. 'horizontal' holds the row height,
// which fixes the label and letter font size while the columns compress.
// 'vertical' does the reverse.
export const scrollZoomAxes = ['both', 'horizontal', 'vertical'] as const
export type ScrollZoomAxis = (typeof scrollZoomAxes)[number]
export const defaultScrollZoomAxis: ScrollZoomAxis = 'both'

// Cell size floors for drawing residue letters and tree labels. Below these a
// 500px block holds thousands of glyphs, and fillText dominates every zoom
// frame. A sprite atlas measured slower.
export const minLetterRowHeight = 8
export const minLetterColWidth = 5

// A wheel-zoom frame draws a block's letters only when the block holds at most
// this many cells; the settle redraw after the gesture draws the rest
export const zoomFrameMaxLetters = 2000

// A feature span draws its label at two pixels under its height, capped at 11,
// so a span shorter than this holds no readable text: an underline bar, a
// sub-row band or a features panel over small rows
export const minFeatureLabelHeight = 9

export function fontSizeFor(rowHeight: number) {
  return Math.min(Math.max(6, rowHeight - 3), 18)
}

// The fitted tree area measures the tip labels and the clade labels at the
// font a default row draws, so a vertical zoom leaves the alignment in place.
// A larger font ellipsizes the labels.
export const labelFitFontSize = fontSizeFor(defaultRowHeight)

// Zoom limits, px per cell. maxCellSize caps both smooth zoom and the stepwise
// zoom-in buttons (which otherwise grow unbounded). minColWidth/minRowHeight are
// the smooth-zoom floors.
export const minColWidth = 0.2
export const minRowHeight = 0.2
export const maxCellSize = 80

// the settings panel's width, which it takes out of the view's
export const settingsPanelWidth = 280

// MSA model defaults
export const defaultBgColor = true
export const defaultColorSchemeName = 'maeditor'
export const defaultShowColumnStats = true

// Tree model defaults
export const defaultDrawLabels = true
export const defaultLabelsAlignRight = false
// The fitted tree area gives the tree pxPerTreeDepth per level of its depth,
// between minTreeWidth and maxFitTreeWidth, beside the widest label, and takes
// at most maxTreeAreaShare of a view with an alignment. Where the share binds,
// the tree keeps minTreeWidth and the labels ellipsize.
export const minTreeWidth = 70
export const maxFitTreeWidth = 160
export const pxPerTreeDepth = 10
export const maxTreeAreaShare = 0.3
export const defaultShowBranchLen = true
export const treeOrders = [
  'branchLength',
  'input',
  'ladderize',
  'ladderizeReverse',
] as const satisfies readonly TreeOrder[]
export const defaultTreeOrder: TreeOrder = 'branchLength'
export const defaultDrawTree = true
export const defaultDrawNodeBubbles = true
export const defaultDrawNodeLabels = false
export const defaultShowTreeOverview = false
export const defaultOverviewHeight = 120

// Neighbor joining does not run above this many rows. The distance matrix is
// O(n^2*L) and the join loop O(n^3), both on the main thread with no progress
// and no cancel: 400 rows measured 1.5s, 800 rows 10s, and 1600 would be about
// seventy. See agent-docs/reference/neighbor-joining-scaling.md.
export const maxNeighborJoiningRows = 500

// The opacity a `rowTint` encoding draws its scale's color at, so the residues
// under the wash stay readable. A color the producer already gave an alpha
// keeps it.
export const rowTintAlpha = 0.25

// The fill a `clades` record with the `highlight` mark draws behind its rows,
// and the opacity a producer's own color takes when it carries none.
export const cladeHighlightColor = '#fff3c4'
export const cladeHighlightAlpha = 0.6

// The largest inline document a snapshot carries by default, which keeps a
// jbrowse session small. A larger pasted or locally-opened file stays in the
// live model and out of the snapshot, and `unshareableData` warns using the
// same number. `MSAModelF({ maxInlineSnapshotBytes })` sets another; the demo
// app's links hold far more.
export const maxInlineSnapshotBytes = 50_000

// Height of the band the `rowPanels` headers draw in, above the strips in the
// top area beside the tree ruler and the minimap. A panel wider than the band
// is tall writes its header across, where it has more room.
export const rowPanelHeaderHeight = 56

// Height of the branch-length scale bar above the tree.
export const treeScaleBarHeight = 22

// Width of a `features` row panel that names none, wide enough for a gene
// neighborhood of a few arrows to read.
export const defaultFeaturePanelWidth = 200

// Width of a `bar`, `point` or `text` row panel that names none, which holds
// an axis of two or three labeled ticks.
export const defaultValuePanelWidth = 80

// The alignment's overlay canvas draws the mouseover, the persisted highlights
// and the row tints over the residues, and the legend key floats above that,
// so a tint reaching the top right corner leaves the key readable.
export const msaOverlayZIndex = 1000
export const legendZIndex = msaOverlayZIndex + 1
