import { legendRows } from './components/msa/legendRows.ts'
import { treeScaleBarHeight } from './constants.ts'

import type { LegendRow } from './components/msa/legendRows.ts'
import type { MsaViewModel } from './model.ts'
import type { Theme } from '@mui/material'

export interface ExportSvgOptions {
  theme: Theme
  includeMinimap?: boolean
  includeTracks?: boolean
  exportType: ExportType
}

/**
 * `entire` draws the whole alignment, `viewport` what is on screen, and
 * `selection` the selected columns across the rows from the first selected to
 * the last
 */
export type ExportType = 'entire' | 'viewport' | 'selection'

// legend geometry, shared by the width calculation and the renderer so the
// reserved column on the right exactly fits the drawn legends
export const LEGEND_PAD = 8
export const LEGEND_ROW_H = 16
export const LEGEND_SWATCH = 12
export const LEGEND_FONT = 12
export const LEGEND_CHAR_W = 7

export const LEGEND_MAX_W = 360
export const LEGEND_TEXT_X = LEGEND_PAD + LEGEND_SWATCH + 6

function getLegendWidth(rows: LegendRow[]) {
  const maxLen = rows.reduce((a, r) => Math.max(a, r.label.length), 0)
  const w = LEGEND_TEXT_X + LEGEND_PAD + maxLen * LEGEND_CHAR_W
  return Math.min(LEGEND_MAX_W, Math.max(120, w))
}

export function legendHeight(rows: LegendRow[]) {
  return LEGEND_PAD * 2 + rows.length * LEGEND_ROW_H
}

// resolved sizes/offsets (in svg user units) for the chosen export, shared by
// every layer; 'entire' renders the whole alignment unscrolled, 'viewport'
// mirrors the live scroll position, and 'selection' crops to the selected block
export interface Layout {
  width: number
  msaAreaWidth: number
  height: number
  contentHeight: number
  trackHeight: number
  // the band the minimap, the row panel headers and the tree overview stacked
  // on the scale bar share across the top
  topHeight: number
  offsetX: number
  offsetY: number
  includeMinimap: boolean
  legendWidth: number
}

export function getLayout(model: MsaViewModel, opts: ExportSvgOptions): Layout {
  const {
    scrollX,
    scrollY,
    totalWidth,
    totalHeight,
    effectiveTreeAreaWidth,
    rowPanelsWidth,
    rowPanelsHeaderHeight,
    totalTrackAreaHeight,
    minimapHeight,
    msaAreaHeight,
    msaCanvasWidth,
    showHorizontalScrollbar,
    treeOverviewHeight,
    treeScaleBar,
  } = model
  const trackHeight = opts.includeTracks ? totalTrackAreaHeight : 0
  // the minimap reflects the live viewport scroll position, so it's only
  // meaningful for a viewport export, never for the entire alignment -- and
  // only when the live view shows one at all, since a minimap over an alignment
  // that already fits marks a viewport wider than the bar
  const includeMinimap =
    opts.exportType === 'viewport' &&
    !!opts.includeMinimap &&
    showHorizontalScrollbar
  const rows = legendRows(model.legends)
  const legendWidth = rows.length > 0 ? getLegendWidth(rows) : 0
  const topHeight = Math.max(
    includeMinimap ? minimapHeight : 0,
    rowPanelsHeaderHeight,
    treeOverviewHeight + (treeScaleBar ? treeScaleBarHeight : 0),
  )
  const gutterWidth = effectiveTreeAreaWidth + rowPanelsWidth

  // width stays content-only; the legend occupies an extra column added at the
  // svg root in MsaSvg. The viewport export takes the alignment canvas's own
  // size rather than the widget's -- the widget box also covers the header, the
  // resize handle and the scrollbars, and rendering that box exports rows and
  // columns the scrollbars hide on screen
  const area =
    opts.exportType === 'viewport'
      ? {
          width: msaCanvasWidth,
          height: msaAreaHeight,
          offsetX: -scrollX,
          offsetY: -scrollY,
        }
      : ((opts.exportType === 'selection'
          ? selectionArea(model)
          : undefined) ?? {
          width: totalWidth,
          height: totalHeight,
          offsetX: 0,
          offsetY: 0,
        })
  return {
    width: area.width + gutterWidth,
    msaAreaWidth: area.width,
    height: area.height + trackHeight + topHeight,
    contentHeight: area.height,
    trackHeight,
    topHeight,
    offsetX: area.offsetX,
    offsetY: area.offsetY,
    includeMinimap,
    legendWidth,
  }
}

/**
 * the selected block in alignment pixels: its visible columns, and the rows
 * from the first selected to the last as the view orders them
 */
export function selectionArea(model: MsaViewModel) {
  const { resolvedSelection, colWidth, rowHeight } = model
  const firstRow = resolvedSelection?.rowRuns[0]?.[0]
  const lastRow = resolvedSelection?.rowRuns.at(-1)?.[1]
  return resolvedSelection && firstRow !== undefined && lastRow !== undefined
    ? {
        width:
          (resolvedSelection.endCol - resolvedSelection.startCol + 1) *
          colWidth,
        height: (lastRow - firstRow + 1) * rowHeight,
        offsetX: resolvedSelection.startCol * colWidth,
        offsetY: firstRow * rowHeight,
      }
    : undefined
}

/**
 * the exported page's size: the layout plus the legend column, and as tall as
 * the legend where the key outgrows a short alignment
 */
export function exportPageSize(model: MsaViewModel, layout: Layout) {
  const { width, height, legendWidth, topHeight } = layout
  return {
    width: width + legendWidth,
    height:
      legendWidth > 0
        ? Math.max(height, topHeight + legendHeight(legendRows(model.legends)))
        : height,
  }
}
