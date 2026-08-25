// Main model defaults
export const defaultRowHeight = 16
export const defaultColWidth = 12
export const defaultHeight = 550
export const defaultScrollX = 0
export const defaultScrollY = 0
export const defaultCurrentAlignment = 0
export const defaultShowDomains = false
export const defaultShowDomainLegend = true
export const defaultHideGaps = true
export const defaultAllowedGappyness = 100
export const defaultSubFeatureRows = false
// row height for each stacked feature when subFeatureRows is on
export const subFeatureRowHeight = 4

// Feature types that are ordinal *segments* of a single transcript (exons and
// the like) rather than categorical domains. Their identity is their position,
// so the overlay alternates two shades to mark boundaries and labels them by
// number, instead of assigning every one a distinct hue + legend row.
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

// Cell size floors for drawing residue letters and tree labels. Below these a
// 500px block holds thousands of glyphs, and fillText -- which no sprite atlas
// beats, measured -- dominates every zoom frame.
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
