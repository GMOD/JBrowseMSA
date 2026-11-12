import { treeScaleBarHeight } from './constants.ts'
import { legendEntries, withoutHidden } from './legendSpec.ts'

import type { LegendEntry } from './legendSpec.ts'
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
export const LEGEND_GRADIENT_W = 120
export const LEGEND_GRADIENT_H = 10

/**
 * the rows the export draws: the model's legends flattened, less the rows the
 * reader hid, which the figure does not draw
 */
export function exportLegendEntries(model: MsaViewModel) {
  return legendEntries({ sections: withoutHidden(model.legends) })
}

function entryWidth(entry: LegendEntry) {
  const text = entry.label.length * LEGEND_CHAR_W
  const { gradient } = entry
  return gradient
    ? LEGEND_PAD * 2 +
        Math.max(
          LEGEND_GRADIENT_W,
          text,
          (gradient.minLabel.length + gradient.maxLabel.length + 2) *
            LEGEND_CHAR_W,
        )
    : LEGEND_TEXT_X + LEGEND_PAD + text
}

// a note wraps to the column the other rows size, rather than widening it
function getLegendWidth(rows: LegendEntry[]) {
  const widest = rows
    .filter(r => r.kind !== 'note')
    .reduce((a, r) => Math.max(a, entryWidth(r)), 0)
  return Math.min(LEGEND_MAX_W, Math.max(120, widest))
}

/** the lines a row's text takes in a column `width` wide */
export function legendLines(entry: LegendEntry, width: number) {
  const perLine = Math.max(
    8,
    Math.floor((width - LEGEND_PAD * 2) / LEGEND_CHAR_W),
  )
  const lines: string[] = []
  if (entry.kind === 'note') {
    for (const word of entry.label.split(' ')) {
      const last = lines.at(-1)
      if (last !== undefined && last.length + word.length + 1 <= perLine) {
        lines[lines.length - 1] = `${last} ${word}`
      } else {
        lines.push(word)
      }
    }
  } else {
    lines.push(entry.label)
  }
  return lines
}

/**
 * a row's height: a line per line of text, and for a gradient its bar and
 * the end labels under it below the label line
 */
export function legendRowHeight(entry: LegendEntry, width: number) {
  return entry.gradient
    ? (entry.label ? LEGEND_ROW_H : 0) + 2 * LEGEND_ROW_H
    : legendLines(entry, width).length * LEGEND_ROW_H
}

export function legendHeight(rows: LegendEntry[], width: number) {
  return (
    LEGEND_PAD * 2 +
    rows.reduce((sum, row) => sum + legendRowHeight(row, width), 0)
  )
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
  const rows = exportLegendEntries(model)
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
        ? Math.max(
            height,
            topHeight + legendHeight(exportLegendEntries(model), legendWidth),
          )
        : height,
  }
}
