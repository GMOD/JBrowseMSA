// Main model defaults
export const defaultRowHeight = 16
export const defaultColWidth = 12
export const defaultHeight = 550
export const defaultScrollX = 0
export const defaultScrollY = 0
export const defaultCurrentAlignment = 0
export const defaultShowDomains = false
export const defaultHideGaps = true
export const defaultAllowedGappyness = 100
export const defaultSubFeatureRows = false
// row height for each stacked feature when subFeatureRows is on
export const subFeatureRowHeight = 4
export const defaultDrawMsaLetters = true
export const defaultScrollZoom = false

// Zoom limits, px per cell. maxCellSize caps both smooth zoom and the stepwise
// zoom-in buttons (which otherwise grow unbounded). minColWidth/minRowHeight are
// the smooth-zoom floors.
export const minColWidth = 0.2
export const minRowHeight = 1
export const maxCellSize = 80

// MSA model defaults
export const defaultBgColor = true
export const defaultColorSchemeName = 'maeditor'

// Tree model defaults
export const defaultDrawLabels = true
export const defaultLabelsAlignRight = false
export const defaultTreeAreaWidth = 400
export const defaultTreeWidth = 300
export const defaultShowBranchLen = true
export const defaultDrawTree = true
export const defaultDrawNodeBubbles = true
