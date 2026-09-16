/* eslint-disable react-refresh/only-export-components */
import React from 'react'

import { when } from 'mobx'

import { visibleRowRange } from './components/getVisibleLeaves.ts'
import MinimapSVG from './components/minimap/MinimapSVG.tsx'
import { legendRows } from './components/msa/legendRows.ts'
import { rasterImageHref, rasterSupported } from './components/msa/msaRaster.ts'
import { renderBoxFeatureCanvasBlock } from './components/msa/renderBoxFeatureCanvasBlock.ts'
import { renderPersistentHighlights } from './components/msa/renderHighlights.ts'
import { renderMSABlock } from './components/msa/renderMSABlock.ts'
import { visibleColRange } from './components/msa/visibleColRange.ts'
import { headerRunsAcross } from './components/rowpanels/headerLayout.ts'
import { renderRowPanels } from './components/rowpanels/renderRowPanel.ts'
import { renderAllTracks } from './components/tracks/drawTracks.ts'
import {
  bracketGap,
  cladeHeight,
  cladeInGutter,
  cladeLabelHorizontal,
  cladeLabelOffset,
} from './components/tree/cladeBrackets.ts'
import { renderTreeCanvas } from './components/tree/renderTreeCanvas.ts'
import { renderTreeOverview } from './components/tree/renderTreeOverview.ts'
import { treeScaleBarHeight } from './constants.ts'
import { measureTextCanvas } from './measureTextCanvas.ts'
import { renderToStaticMarkup, svgSafeColors } from './renderToStaticMarkup.ts'
import { outlineColor } from './util.ts'

import type { LegendRow } from './components/msa/legendRows.ts'
import type { MsaViewModel } from './model.ts'
import type { Context as ContextType } from '@jbrowse/svgcanvas'
import type { Theme } from '@mui/material'

export interface ExportSvgOptions {
  theme: Theme
  includeMinimap?: boolean
  includeTracks?: boolean
  exportType: 'entire' | 'viewport'
}

// legend geometry, shared by the width calculation and the renderer so the
// reserved column on the right exactly fits the drawn legends
const LEGEND_PAD = 8
const LEGEND_ROW_H = 16
const LEGEND_SWATCH = 12
const LEGEND_FONT = 12
const LEGEND_CHAR_W = 7

// the width of a character as a fraction of the font size, close enough for a
// sans-serif average
const CHAR_WIDTH = 0.6

const LEGEND_MAX_W = 360
const LEGEND_TEXT_X = LEGEND_PAD + LEGEND_SWATCH + 6

function getLegendWidth(rows: LegendRow[]) {
  const maxLen = rows.reduce((a, r) => Math.max(a, r.label.length), 0)
  const w = LEGEND_TEXT_X + LEGEND_PAD + maxLen * LEGEND_CHAR_W
  return Math.min(LEGEND_MAX_W, Math.max(120, w))
}

function legendHeight(rows: LegendRow[]) {
  return LEGEND_PAD * 2 + rows.length * LEGEND_ROW_H
}

// resolved sizes/offsets (in svg user units) for the chosen export, shared by
// every layer; 'entire' renders the whole alignment unscrolled, 'viewport'
// mirrors the live scroll position
interface Layout {
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

function getLayout(model: MsaViewModel, opts: ExportSvgOptions): Layout {
  const {
    scrollX,
    scrollY,
    totalWidth,
    totalHeight,
    treeAreaWidth,
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
  const gutterWidth = treeAreaWidth + rowPanelsWidth

  // width stays content-only; the legend occupies an extra column added at the
  // svg root in MsaSvg. The viewport export takes the alignment canvas's own
  // size rather than the widget's -- the widget box also covers the header, the
  // resize handle and the scrollbars, and rendering that box exports rows and
  // columns the scrollbars hide on screen
  return opts.exportType === 'entire'
    ? {
        width: totalWidth + gutterWidth,
        msaAreaWidth: totalWidth,
        height: totalHeight + trackHeight + topHeight,
        contentHeight: totalHeight,
        trackHeight,
        topHeight,
        offsetX: 0,
        offsetY: 0,
        includeMinimap,
        legendWidth,
      }
    : {
        width: msaCanvasWidth + gutterWidth,
        msaAreaWidth: msaCanvasWidth,
        height: msaAreaHeight + topHeight + trackHeight,
        contentHeight: msaAreaHeight,
        trackHeight,
        topHeight,
        offsetX: -scrollX,
        offsetY: -scrollY,
        includeMinimap,
        legendWidth,
      }
}

export async function renderToSvg(model: MsaViewModel, opts: ExportSvgOptions) {
  // dataInitialized stays false while the model holds a load error, so waiting
  // on it alone would never settle
  await when(() => model.dataInitialized || !!model.error)
  if (model.error) {
    throw model.error
  }
  const { Context } = await import('@jbrowse/svgcanvas')
  // Each svgcanvas layer is already serialized SVG, and React would have to
  // parse it into a second DOM only for the export to serialize it back out.
  // The layers register themselves here instead, and their markup is spliced
  // into the page as strings.
  const layers = new Map<string, ContextType>()
  const markup = renderToStaticMarkup(
    <MsaSvg
      model={model}
      theme={opts.theme}
      Context={Context}
      layout={getLayout(model, opts)}
      layers={layers}
    />,
  )
  return svgSafeColors(
    markup.replaceAll(/<g data-layer="([^"]+)"><\/g>/g, (match, id: string) => {
      const ctx = layers.get(id)
      return ctx ? `<g id="${id}">${ctx.getSvg().innerHTML}</g>` : match
    }),
  )
}

function MsaSvg({
  model,
  theme,
  Context,
  layout,
  layers,
}: {
  model: MsaViewModel
  theme: Theme
  Context: typeof ContextType
  layout: Layout
  layers: LayerMap
}) {
  const { width, trackHeight, includeMinimap, legendWidth, topHeight } = layout
  const { treeAreaWidth, rowPanelsWidth } = model
  const totalWidth = width + legendWidth
  const legendTop = topHeight
  // a short alignment with many legend entries has a key taller than its rows,
  // and the page has to hold the whole key
  const height =
    legendWidth > 0
      ? Math.max(
          layout.height,
          legendTop + legendHeight(legendRows(model.legends)),
        )
      : layout.height
  const props = { Context, model, theme, layout, layers }

  const body = (
    <>
      {trackHeight > 0 ? <TrackRendering {...props} /> : null}
      <g
        transform={trackHeight > 0 ? `translate(0 ${trackHeight})` : undefined}
      >
        <CoreRendering {...props} />
      </g>
    </>
  )

  return (
    <svg
      width={totalWidth}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`0 0 ${totalWidth} ${height}`}
    >
      {/* every layer below draws in the theme's colors, so the page has to be
          the theme's background too -- a hardcoded white one turns a dark-theme
          export into white text on white */}
      <rect
        width="100%"
        height="100%"
        fill={theme.palette.background.default}
      />
      {topHeight > 0 ? (
        <>
          {includeMinimap ? (
            <g
              id="minimap-panel"
              transform={`translate(${treeAreaWidth + rowPanelsWidth} 0)`}
            >
              <MinimapSVG model={model} theme={theme} />
            </g>
          ) : null}
          <RowPanelHeadersSVG
            model={model}
            theme={theme}
            bandHeight={topHeight}
          />
          {model.showTreeOverview ? (
            <TreeOverviewSVG
              model={model}
              theme={theme}
              Context={Context}
              layers={layers}
            />
          ) : null}
          <TreeScaleBarSVG model={model} theme={theme} />
          <g transform={`translate(0 ${topHeight})`}>{body}</g>
        </>
      ) : (
        body
      )}
      {legendWidth > 0 ? (
        <g id="legend-panel" transform={`translate(${width} ${legendTop})`}>
          <LegendSVG model={model} theme={theme} width={legendWidth} />
        </g>
      ) : null}
    </svg>
  )
}

// The tree overview in the top band, over the tree column, where the live view
// puts it. It is part of the figure rather than chrome: the inset is what says
// where the focused clade sits in the whole tree.
function TreeOverviewSVG({
  model,
  theme,
  Context,
  layers,
}: {
  model: MsaViewModel
  theme: Theme
  Context: typeof ContextType
  layers: LayerMap
}) {
  const { treeAreaWidth, overviewHeight, id } = model
  const ctx = new Context(treeAreaWidth, overviewHeight)
  renderTreeOverview({
    model,
    ctx,
    theme,
    width: treeAreaWidth,
    height: overviewHeight,
  })
  return (
    <ClipGroup
      panelId="tree-overview"
      clipId={`tree-overview-${id}`}
      width={treeAreaWidth}
      height={overviewHeight}
      ctx={ctx}
      layers={layers}
    />
  )
}

// The branch-length scale bar under the tree overview, where the live view puts
// it (see TreeRuler). A phylogram whose branch lengths are drawn to a scale
// nothing states is a figure a reader cannot measure, so the export carries the
// bar even though it is chrome on screen.
function TreeScaleBarSVG({
  model,
  theme,
}: {
  model: MsaViewModel
  theme: Theme
}) {
  const { marginLeft, treeScaleBar: bar, treeOverviewHeight } = model
  if (!bar) {
    return null
  }
  const y = treeOverviewHeight + treeScaleBarHeight
  const color = theme.palette.text.primary
  return (
    <g id="tree-scalebar">
      <text x={marginLeft} y={y - 9} fontSize={10} fill={color}>
        {bar.label}
      </text>
      <path
        d={`M${marginLeft} ${y - 7} v6 h${bar.px} v-6`}
        fill="none"
        stroke={color}
      />
    </g>
  )
}

// Each strip's header over the column it names, turned on its side, where the
// live view puts it (see RowPanelHeaders). The baseline runs up the figure, so
// the name sits to the left of it, the way TrackLabelsSVG offsets a horizontal
// baseline by a third of the font size.
function RowPanelHeadersSVG({
  model,
  theme,
  bandHeight,
}: {
  model: MsaViewModel
  theme: Theme
  bandHeight: number
}) {
  const { resolvedRowPanels, treeAreaWidth, fontSize } = model
  const y = bandHeight - 4
  return resolvedRowPanels.length === 0 ? null : (
    <g id="rowpanel-headers">
      {resolvedRowPanels.map(panel => {
        const across = headerRunsAcross(panel.width)
        const size = across ? fontSize : Math.min(fontSize, panel.width)
        const center = treeAreaWidth + panel.offsetX + panel.width / 2
        const x = across ? center : center + size / 3
        const room = across ? panel.width : y - LEGEND_PAD
        const maxChars = Math.floor(room / (size * CHAR_WIDTH))
        return size < 5 ? null : (
          <text
            key={panel.id}
            x={x}
            y={y}
            {...(across
              ? { textAnchor: 'middle' }
              : { transform: `rotate(-90 ${x} ${y})` })}
            fontSize={size}
            fill={theme.palette.text.primary}
          >
            {panel.header.length > maxChars
              ? `${panel.header.slice(0, Math.max(1, maxChars - 1))}…`
              : panel.header}
          </text>
        )
      })}
    </g>
  )
}

// A label past the room it has, cut to what fits with an ellipsis. The measure
// is the one cladeGutterWidth sizes the gutter with, so a label the gutter
// holds keeps every character.
function clipCladeLabel(label: string, room: number, fontSize: number) {
  const width = measureTextCanvas(label, fontSize)
  if (width <= room) {
    return label
  }
  const fits = Math.floor((label.length * room) / width)
  return `${label.slice(0, Math.max(1, fits - 1))}…`
}

// Each bracket's label in the gutter beside its bar, where the live view puts
// it (see CladeLabels). The canvas layer draws the bar; a label longer than the
// gutter or the clade is clipped, since text that overruns runs off the figure.
function CladeLabelsSVG({
  model,
  theme,
  offsetY,
}: {
  model: MsaViewModel
  theme: Theme
  offsetY: number
}) {
  const {
    resolvedClades,
    cladeGutterWidth,
    rowHeight,
    treeAreaWidth,
    fontSize,
  } = model
  if (cladeGutterWidth === 0) {
    return null
  }
  const gutterLeft = treeAreaWidth - cladeGutterWidth
  return (
    <g id="clade-labels">
      {resolvedClades.map((clade, index) => {
        const { label, markColor, rows } = clade
        if (!label || !cladeInGutter(clade)) {
          return null
        }
        const left = gutterLeft + cladeLabelOffset(clade)
        const top = rows[0] * rowHeight - offsetY
        const height = cladeHeight(clade, rowHeight)
        const horizontal = cladeLabelHorizontal(clade, rowHeight, fontSize)
        const room = horizontal ? treeAreaWidth - left - bracketGap : height
        const x = horizontal ? left : left + fontSize
        const y = horizontal ? top + height / 2 + fontSize / 3 : top + height
        return (
          <text
            key={`${rows[0]}-${rows[1]}-${index}`}
            x={x}
            y={y}
            transform={horizontal ? undefined : `rotate(-90 ${x} ${y})`}
            fontSize={fontSize}
            fill={markColor ?? theme.palette.text.primary}
          >
            {clipCladeLabel(label, room, fontSize)}
          </text>
        )
      })}
    </g>
  )
}

// the color keys drawn as a reserved column to the right of the alignment,
// mirroring the on-screen AnnotationLegend overlay
function LegendSVG({
  model,
  theme,
  width,
}: {
  model: MsaViewModel
  theme: Theme
  width: number
}) {
  const rows = legendRows(model.legends)
  const boxHeight = legendHeight(rows)
  // the column is capped at LEGEND_MAX_W, so a name too long for it has to be
  // clipped here -- text that overruns the reserved width runs off the figure
  const maxChars = Math.floor(
    (width - LEGEND_TEXT_X - LEGEND_PAD) / LEGEND_CHAR_W,
  )
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={width - 4}
        height={boxHeight}
        fill={theme.palette.background.paper}
        stroke={theme.palette.divider}
        rx={2}
      />
      {rows.map((row, i) => {
        const y = LEGEND_PAD + i * LEGEND_ROW_H
        return (
          <g key={row.key}>
            {row.color ? (
              <rect
                x={LEGEND_PAD}
                y={y}
                width={LEGEND_SWATCH}
                height={LEGEND_SWATCH}
                fill={row.color}
                stroke={outlineColor(row.color)}
              />
            ) : null}
            <text
              x={row.color ? LEGEND_TEXT_X : LEGEND_PAD}
              y={y + LEGEND_SWATCH - 1}
              fontSize={LEGEND_FONT}
              fontWeight={row.color ? undefined : 'bold'}
              fill={theme.palette.text.primary}
            >
              {row.label.length > maxChars
                ? `${row.label.slice(0, Math.max(1, maxChars - 1))}…`
                : row.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

type LayerMap = Map<string, ContextType>

interface LayerProps {
  model: MsaViewModel
  theme: Theme
  layout: Layout
  Context: typeof ContextType
  layers: LayerMap
}

function CoreRendering({ model, theme, layout, Context, layers }: LayerProps) {
  const { contentHeight, offsetX, offsetY, msaAreaWidth } = layout
  const { treeAreaWidth, rowPanelsWidth, id } = model

  const treeCtx = new Context(treeAreaWidth, contentHeight)
  renderTreeCanvas({
    model,
    theme,
    ctx: treeCtx,
    offsetY,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
  })

  const rowPanelsCtx = rowPanelsWidth
    ? new Context(rowPanelsWidth, contentHeight)
    : undefined
  if (rowPanelsCtx) {
    renderRowPanels({
      model,
      theme,
      ctx: rowPanelsCtx,
      offsetY,
      blockSizeYOverride: contentHeight,
      highResScaleFactorOverride: 1,
    })
  }

  const raster = rasterBackground({ model, theme, layout })

  const msaCtx = new Context(msaAreaWidth, contentHeight)
  renderBoxFeatureCanvasBlock({
    model,
    theme,
    ctx: msaCtx,
    offsetX,
    offsetY,
    // the overlay culls bands to this width; without it the export falls back
    // to the on-screen 500px block size and drops every band past it
    blockSizeXOverride: msaAreaWidth,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
  })
  renderMSABlock({
    model,
    theme,
    ctx: msaCtx,
    offsetX,
    offsetY,
    blockSizeXOverride: msaAreaWidth,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
    rasterTiles: !!raster,
  })
  msaCtx.resetTransform()
  renderPersistentHighlights({
    ctx: msaCtx,
    model,
    theme,
    offsetX,
    offsetY,
    width: msaAreaWidth,
    height: contentHeight,
  })

  return (
    <>
      <ClipGroup
        panelId="tree-panel"
        clipId={`tree-${id}`}
        width={treeAreaWidth}
        height={contentHeight}
        ctx={treeCtx}
        layers={layers}
      />
      <CladeLabelsSVG model={model} theme={theme} offsetY={offsetY} />
      {rowPanelsCtx ? (
        <ClipGroup
          panelId="rowpanels-panel"
          clipId={`rowpanels-${id}`}
          width={rowPanelsWidth}
          height={contentHeight}
          transform={`translate(${treeAreaWidth} 0)`}
          ctx={rowPanelsCtx}
          layers={layers}
        />
      ) : null}
      <ClipGroup
        panelId="msa-panel"
        clipId={`msa-${id}`}
        width={msaAreaWidth}
        height={contentHeight}
        transform={`translate(${treeAreaWidth + rowPanelsWidth} 0)`}
        ctx={msaCtx}
        layers={layers}
        underlay={raster}
      />
    </>
  )
}

/**
 * The alignment background as a single <image>, under the live canvas's
 * conditions: no domain overlay boxes, background coloring on, and a canvas
 * that reads back.
 *
 * The vector path's <rect> per cell exhausts the heap on a real alignment. The
 * image is one pixel per cell, and image-rendering keeps the upscaled cell
 * edges hard, so it matches the rects pixel for pixel.
 */
function rasterBackground({
  model,
  theme,
  layout,
}: {
  model: MsaViewModel
  theme: Theme
  layout: Layout
}) {
  const { contentHeight, offsetX, offsetY, msaAreaWidth } = layout
  const { colWidth, rowHeight, actuallyShowDomains, bgColor } = model
  if (actuallyShowDomains || !bgColor || !rasterSupported()) {
    return undefined
  }
  const { xStart, xEnd } = visibleColRange({
    offsetX,
    blockWidth: msaAreaWidth,
    colWidth,
  })
  const { yStart, yEnd } = visibleRowRange({
    model,
    offsetY,
    blockSizeY: contentHeight,
  })
  const numCols = Math.min(xEnd, model.numColumns) - xStart
  const numRows = Math.min(yEnd, model.numRows) - yStart
  const href = rasterImageHref({
    model,
    theme,
    col0: xStart,
    row0: yStart,
    numCols,
    numRows,
  })
  return href ? (
    <image
      href={href}
      x={xStart * colWidth - offsetX}
      y={yStart * rowHeight - offsetY}
      width={numCols * colWidth}
      height={numRows * rowHeight}
      imageRendering="pixelated"
      preserveAspectRatio="none"
    />
  ) : undefined
}

function TrackRendering({ model, theme, layout, Context, layers }: LayerProps) {
  const { trackHeight, offsetX, msaAreaWidth } = layout
  const { treeAreaWidth, rowPanelsWidth, id } = model

  const ctx = new Context(msaAreaWidth, trackHeight)
  renderAllTracks({
    model,
    ctx,
    theme,
    offsetX,
    blockSizeXOverride: msaAreaWidth,
    highResScaleFactorOverride: 1,
  })

  return (
    <>
      <TrackLabelsSVG model={model} theme={theme} />
      <g transform={`translate(${treeAreaWidth + rowPanelsWidth} 0)`}>
        <ClipGroup
          panelId="tracks-panel"
          clipId={`tracks-${id}`}
          width={msaAreaWidth}
          height={trackHeight}
          ctx={ctx}
          layers={layers}
        />
      </g>
    </>
  )
}

// Each track's name in the tree-width column beside it, where the live view puts
// it (see TrackLabel). Without these the figure has an unlabeled bar chart and
// an unlabeled logo, and nothing says which is which.
function TrackLabelsSVG({
  model,
  theme,
}: {
  model: MsaViewModel
  theme: Theme
}) {
  const { turnedOnTracks, treeAreaWidth, fontSize, drawLabels } = model
  if (!drawLabels) {
    return null
  }
  const labels = turnedOnTracks.map((track, i) => {
    const { id, name, height } = track.model
    const size = Math.min(height, fontSize)
    const top = turnedOnTracks
      .slice(0, i)
      .reduce((acc, t) => acc + t.model.height, 0)
    return { id, name, size, baseline: top + height / 2 + size / 3 }
  })
  return (
    <>
      {labels.map(({ id, name, size, baseline }) => {
        return size < 5 ? null : (
          <text
            key={id}
            x={treeAreaWidth - 4}
            y={baseline}
            fontSize={size}
            textAnchor="end"
            fill={theme.palette.text.primary}
          >
            {name}
          </text>
        )
      })}
    </>
  )
}

// Clips a svgcanvas Context to its box and leaves a placeholder for renderToSvg
// to splice the layer's own markup into. `underlay` draws beneath that markup,
// inside the same clip, for the parts of a layer React emits directly.
//
// `panelId` names the spliced group in the output, the same name in every
// export, so a figure can be taken apart in Illustrator or svgutils. `clipId`
// carries the model id, which keeps two viewers on one page from colliding.
function ClipGroup({
  panelId,
  clipId,
  width,
  height,
  transform,
  ctx,
  layers,
  underlay,
}: {
  panelId: string
  clipId: string
  width: number
  height: number
  transform?: string
  ctx: ContextType
  layers: LayerMap
  underlay?: React.ReactNode
}) {
  layers.set(panelId, ctx)
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} transform={transform}>
        {underlay}
        <g data-layer={panelId} />
      </g>
    </>
  )
}
