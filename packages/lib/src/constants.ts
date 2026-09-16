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
// row height for each stacked feature when subFeatureRows is on
export const subFeatureRowHeight = 4

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
export const defaultDrawTree = true
export const defaultDrawNodeBubbles = true

// Neighbor joining does not run above this many rows. The distance matrix is
// O(n^2*L) and the join loop O(n^3), both on the main thread with no progress
// and no cancel: 400 rows measured 1.5s, 800 rows 10s, and 1600 would be about
// seventy. See agent-docs/ideas/neighbor-joining-scaling.md.
export const maxNeighborJoiningRows = 500

// The largest inline document the snapshot carries. A larger pasted or
// locally-opened file stays in the live model and out of the snapshot, keeping
// shared URLs sendable. `unshareableData` warns using the same number.
export const maxInlineSnapshotBytes = 50_000
