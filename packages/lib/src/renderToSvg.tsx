/* eslint-disable react-refresh/only-export-components */
import React from 'react'

import { when } from 'mobx'

import { visibleRowRange } from './components/getVisibleLeaves.ts'
import MinimapSVG from './components/minimap/MinimapSVG.tsx'
import { legendRows } from './components/msa/legendRows.ts'
import { rasterApplies, rasterImageHref } from './components/msa/msaRaster.ts'
import {
  highlightStripShown,
  renderPersistentHighlights,
} from './components/msa/renderHighlights.ts'
import { renderMSABlock } from './components/msa/renderMSABlock.ts'
import { visibleColRange } from './components/msa/visibleColRange.ts'
import { headerRunsAcross } from './components/rowpanels/headerLayout.ts'
import { renderRowPanel } from './components/rowpanels/renderRowPanel.ts'
import { renderAllTracks } from './components/tracks/drawTracks.ts'
import ScaleBarSVG from './components/tree/ScaleBarSVG.tsx'
import { cladeLabelBoxes } from './components/tree/cladeBrackets.ts'
import { ellipsize } from './components/tree/ellipsize.ts'
import { renderTreeCanvas } from './components/tree/renderTreeCanvas.ts'
import { renderTreeOverview } from './components/tree/renderTreeOverview.ts'
import { treeScaleBarHeight } from './constants.ts'
import {
  LEGEND_CHAR_W,
  LEGEND_FONT,
  LEGEND_PAD,
  LEGEND_ROW_H,
  LEGEND_SWATCH,
  LEGEND_TEXT_X,
  exportPageSize,
  getLayout,
  legendHeight,
} from './exportLayout.ts'
import { measureTextCanvas } from './measureTextCanvas.ts'
import { renderToStaticMarkup, svgSafeColors } from './renderToStaticMarkup.ts'
import { outlineColor } from './util.ts'

import type { ExportSvgOptions, Layout } from './exportLayout.ts'
import type { MsaViewModel } from './model.ts'
import type { Context as ContextType } from '@jbrowse/svgcanvas'
import type { Theme } from '@mui/material'

export type { ExportSvgOptions } from './exportLayout.ts'

export async function renderToSvg(model: MsaViewModel, opts: ExportSvgOptions) {
  // dataInitialized stays false while the model holds a load error, so waiting
  // on it alone would never settle
  await when(() => model.dataInitialized || !!model.error)
  const { error } = model
  if (error) {
    throw error instanceof Error
      ? error
      : new Error('the view holds a load error', { cause: error })
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
  // innerHTML serializes as HTML, and an XML parser rejects its &nbsp;
  return svgSafeColors(
    markup.replaceAll(/<g data-layer="([^"]+)"><\/g>/g, (match, id: string) => {
      const ctx = layers.get(id)
      return ctx ? `<g id="${id}">${ctx.getSvg().innerHTML}</g>` : match
    }),
  ).replaceAll('&nbsp;', '&#160;')
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
  const { effectiveTreeAreaWidth, rowPanelsWidth } = model
  const { width: totalWidth, height } = exportPageSize(model, layout)
  const legendTop = topHeight
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
      // the canvas layers name sans-serif on each glyph; the legend, labels
      // and headers inherit it here instead of an editor's default serif
      fontFamily="sans-serif"
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
              transform={`translate(${effectiveTreeAreaWidth + rowPanelsWidth} 0)`}
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
  const { effectiveTreeAreaWidth, overviewHeight, id } = model
  const ctx = new Context(effectiveTreeAreaWidth, overviewHeight)
  renderTreeOverview({
    model,
    ctx,
    theme,
    width: effectiveTreeAreaWidth,
    height: overviewHeight,
  })
  return (
    <ClipGroup
      panelId="tree-overview"
      clipId={`tree-overview-${id}`}
      width={effectiveTreeAreaWidth}
      height={overviewHeight}
      ctx={ctx}
      layers={layers}
    />
  )
}

// The branch-length scale bar under the tree overview, where the live view
// puts it (see TreeRuler). A phylogram whose branch lengths are drawn to a
// scale nothing states is a figure a reader cannot measure, so the export
// carries the bar even though it is chrome on screen.
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
  return (
    <g id="tree-scalebar">
      <ScaleBarSVG
        bar={bar}
        marginLeft={marginLeft}
        y={treeOverviewHeight + treeScaleBarHeight}
        color={theme.palette.text.primary}
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
  const { resolvedRowPanels, effectiveTreeAreaWidth, fontSize } = model
  const y = bandHeight - 4
  return resolvedRowPanels.length === 0 ? null : (
    <g id="rowpanel-headers">
      {resolvedRowPanels.map(panel => {
        const across = headerRunsAcross(panel.width)
        const size = across ? fontSize : Math.min(fontSize, panel.width)
        const center = effectiveTreeAreaWidth + panel.offsetX + panel.width / 2
        const x = across ? center : center + size / 3
        const room = across ? panel.width : y - LEGEND_PAD
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
            {
              ellipsize(t => measureTextCanvas(t, size), panel.header, room)
                .text
            }
          </text>
        )
      })}
    </g>
  )
}

// Each bracket's label in the gutter beside its bar, where the live view
// puts it (see CladeLabels). The canvas layer draws the bar; a label longer
// than the gutter or the clade is clipped, since text that overruns runs off
// the figure. cladeGutterWidth sizes the gutter with the same
// measureTextCanvas, so a label the gutter holds keeps every character.
function CladeLabelsSVG({
  model,
  theme,
  offsetY,
}: {
  model: MsaViewModel
  theme: Theme
  offsetY: number
}) {
  const { fontSize } = model
  const boxes = cladeLabelBoxes(model)
  return boxes.length === 0 ? null : (
    <g id="clade-labels">
      {boxes.map(box => {
        const top = box.top - offsetY
        const x = box.horizontal ? box.left : box.left + fontSize
        const y = box.horizontal
          ? top + box.height / 2 + fontSize / 3
          : top + box.height
        return (
          <text
            key={box.key}
            x={x}
            y={y}
            transform={box.horizontal ? undefined : `rotate(-90 ${x} ${y})`}
            fontSize={fontSize}
            fill={box.color ?? theme.palette.text.primary}
          >
            {
              ellipsize(
                t => measureTextCanvas(t, fontSize),
                box.label,
                box.horizontal ? box.width : box.height,
              ).text
            }
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
  const room = width - LEGEND_TEXT_X - LEGEND_PAD
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
              {ellipsize(t => t.length * LEGEND_CHAR_W, row.label, room).text}
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
  const { effectiveTreeAreaWidth, rowPanelsWidth, resolvedRowPanels, id } =
    model

  const treeCtx = new Context(effectiveTreeAreaWidth, contentHeight)
  renderTreeCanvas({
    model,
    theme,
    ctx: treeCtx,
    offsetY,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
  })

  const rowPanelCtxs = resolvedRowPanels.map(panel => {
    const ctx = new Context(panel.width, contentHeight)
    renderRowPanel({
      model,
      theme,
      panel,
      ctx,
      offsetY,
      blockSizeYOverride: contentHeight,
      highResScaleFactorOverride: 1,
    })
    return { panel, ctx }
  })

  const raster = rasterBackground({ model, theme, layout })

  const msaCtx = new Context(msaAreaWidth, contentHeight)
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
    domains: true,
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
    stripShown: layout.trackHeight > 0 && highlightStripShown(model),
  })

  return (
    <>
      <ClipGroup
        panelId="tree-panel"
        clipId={`tree-${id}`}
        width={effectiveTreeAreaWidth}
        height={contentHeight}
        ctx={treeCtx}
        layers={layers}
      />
      <CladeLabelsSVG model={model} theme={theme} offsetY={offsetY} />
      {rowPanelCtxs.map(({ panel, ctx }, i) => (
        <ClipGroup
          key={panel.id}
          panelId={`rowpanel-${i}`}
          clipId={`rowpanel-${id}-${i}`}
          width={panel.width}
          height={contentHeight}
          transform={`translate(${effectiveTreeAreaWidth + panel.offsetX} 0)`}
          ctx={ctx}
          layers={layers}
        />
      ))}
      <ClipGroup
        panelId="msa-panel"
        clipId={`msa-${id}`}
        width={msaAreaWidth}
        height={contentHeight}
        transform={`translate(${effectiveTreeAreaWidth + rowPanelsWidth} 0)`}
        ctx={msaCtx}
        layers={layers}
        underlay={raster}
      />
    </>
  )
}

/**
 * The alignment background as a single <image>, wherever the live canvas
 * draws the raster.
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
  const { colWidth, rowHeight } = model
  if (!rasterApplies(model)) {
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
  const { effectiveTreeAreaWidth, rowPanelsWidth, id } = model

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
      <g transform={`translate(${effectiveTreeAreaWidth + rowPanelsWidth} 0)`}>
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

// Each track's name in the tree-width column beside it, where the live view
// puts it (see TrackLabel). Without these the figure has an unlabeled bar chart
// and an unlabeled logo, and nothing says which is which.
function TrackLabelsSVG({
  model,
  theme,
}: {
  model: MsaViewModel
  theme: Theme
}) {
  const { turnedOnTracks, effectiveTreeAreaWidth, fontSize, drawLabels } = model
  if (!drawLabels) {
    return null
  }
  const labels = turnedOnTracks.map((track, i) => {
    const { id, name, height } = track.model
    const size = Math.min(height, fontSize)
    const top = turnedOnTracks
      .slice(0, i)
      .reduce((acc, t) => acc + t.model.height, 0)
    // pinned to the top of the track, as the live view's flex row pins it
    return { id, name, size, baseline: top + size * 0.8 }
  })
  return (
    <>
      {labels.map(({ id, name, size, baseline }) => {
        return size < 5 ? null : (
          <text
            key={id}
            x={effectiveTreeAreaWidth - 4}
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
