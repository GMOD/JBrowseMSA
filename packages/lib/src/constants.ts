import type { TreeOrder } from './types.ts'

// Main model defaults
export const defaultRowHeight = 16
export const defaultColWidth = 12
export const defaultHeight = 550
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
// alternates two shades across them and labels them by number, where a domain
// type gets its own hue and legend row.
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

// A feature span draws its label at two pixels under its height, capped at 11,
// so a span shorter than this holds no readable text: an underline bar, a
// sub-row band or a features panel over small rows
export const minFeatureLabelHeight = 9

// Tree labels are measured once at this size and scaled to the current font
// size, so a vertical zoom never re-measures the tree.
export const labelReferenceFontSize = 16

// Zoom limits, px per cell. maxCellSize caps both smooth zoom and the stepwise
// zoom-in buttons (which otherwise grow unbounded). minColWidth/minRowHeight are
// the smooth-zoom floors.
export const minColWidth = 0.2
export const minRowHeight = 1
export const maxCellSize = 80

// MSA model defaults
export const defaultBgColor = true
export const defaultColorSchemeName = 'maeditor'
export const defaultShowColumnStats = true

// Tree model defaults
export const defaultDrawLabels = true
export const defaultLabelsAlignRight = false
export const defaultTreeAreaWidth = 400
export const defaultTreeWidth = 300
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
// seventy. See agent-docs/ideas/neighbor-joining-scaling.md.
export const maxNeighborJoiningRows = 500

// The opacity a `rowTint` encoding draws its scale's color at, so the residues
// under the wash stay readable. A color the producer already gave an alpha
// keeps it.
export const rowTintAlpha = 0.25

// The fill a `clades` record with the `highlight` mark draws behind its rows,
// and the opacity a producer's own color takes when it carries none.
export const cladeHighlightColor = '#fff3c4'
export const cladeHighlightAlpha = 0.6

// The largest inline document the snapshot carries. A larger pasted or
// locally-opened file stays in the live model and out of the snapshot, and
// `unshareableData` warns using the same number. The demo app gzips the
// snapshot into `?data=`, where 15 kB of the hosted protein alignments encodes
// to 6,300-7,600 characters, under the 8,192 gmod.org accepts.
export const maxInlineSnapshotBytes = 15_000

// Height of the band the `rowPanels` headers draw in, above the strips in the
// top area beside the tree ruler and the minimap. A panel wider than the band
// is tall writes its header across, where it has more room.
export const rowPanelHeaderHeight = 56

// Height of the branch-length scale bar above the tree.
export const treeScaleBarHeight = 22

// Width of a `features` row panel that names none, wide enough for a gene
// neighborhood of a few arrows to read.
export const defaultFeaturePanelWidth = 200

// The alignment's overlay canvas draws the mouseover, the persisted highlights
// and the row tints over the residues, and the legend key floats above that,
// so a tint reaching the top right corner leaves the key readable.
export const msaOverlayZIndex = 1000
export const legendZIndex = msaOverlayZIndex + 1
