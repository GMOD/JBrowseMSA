/* eslint-disable react-refresh/only-export-components */
import React from 'react'

import { renderToStaticMarkup } from '@jbrowse/core/util'
import { when } from 'mobx'

import MinimapSVG from './components/minimap/MinimapSVG.tsx'
import { renderBoxFeatureCanvasBlock } from './components/msa/renderBoxFeatureCanvasBlock.ts'
import { renderMSABlock } from './components/msa/renderMSABlock.ts'
import { renderAllTracks } from './components/tracks/drawTracks.ts'
import { renderTreeCanvas } from './components/tree/renderTreeCanvas.ts'
import { colorContrast } from './util.ts'

import type { MsaViewModel } from './model.ts'
import type { Context as ContextType } from '@jbrowse/svgcanvas'
import type { Theme } from '@mui/material'

export interface ExportSvgOptions {
  theme: Theme
  includeMinimap?: boolean
  includeTracks?: boolean
  exportType: 'entire' | 'viewport'
}

// domain-legend geometry, shared by the width calculation and the renderer so
// the reserved column on the right exactly fits the drawn legend
const LEGEND_PAD = 8
const LEGEND_ROW_H = 16
const LEGEND_SWATCH = 12
const LEGEND_FONT = 12
const LEGEND_CHAR_W = 7

const LEGEND_MAX_W = 360
const LEGEND_TEXT_X = LEGEND_PAD + LEGEND_SWATCH + 6

function getLegendWidth(model: MsaViewModel) {
  const maxLen = model.visibleDomainTypes.reduce(
    (a, d) => Math.max(a, d.name.length),
    0,
  )
  const w = LEGEND_TEXT_X + LEGEND_PAD + maxLen * LEGEND_CHAR_W
  return Math.min(LEGEND_MAX_W, Math.max(120, w))
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
    totalTrackAreaHeight,
    minimapHeight,
    msaAreaHeight,
    msaCanvasWidth,
    showHorizontalScrollbar,
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
  const legendWidth =
    model.actuallyShowDomains && model.visibleDomainTypes.length > 0
      ? getLegendWidth(model)
      : 0

  // width stays content-only; the legend occupies an extra column added at the
  // svg root in MsaSvg. The viewport export takes the alignment canvas's own
  // size rather than the widget's -- the widget box also covers the header, the
  // resize handle and the scrollbars, and rendering that box exports rows and
  // columns the scrollbars hide on screen
  return opts.exportType === 'entire'
    ? {
        width: totalWidth + treeAreaWidth,
        msaAreaWidth: totalWidth,
        height: totalHeight + trackHeight,
        contentHeight: totalHeight,
        trackHeight,
        offsetX: 0,
        offsetY: 0,
        includeMinimap,
        legendWidth,
      }
    : {
        width: msaCanvasWidth + treeAreaWidth,
        msaAreaWidth: msaCanvasWidth,
        height:
          msaAreaHeight + (includeMinimap ? minimapHeight : 0) + trackHeight,
        contentHeight: msaAreaHeight,
        trackHeight,
        offsetX: -scrollX,
        offsetY: -scrollY,
        includeMinimap,
        legendWidth,
      }
}

export async function renderToSvg(model: MsaViewModel, opts: ExportSvgOptions) {
  await when(() => model.dataInitialized)
  const { Context } = await import('@jbrowse/svgcanvas')
  return renderToStaticMarkup(
    <MsaSvg
      model={model}
      theme={opts.theme}
      Context={Context}
      layout={getLayout(model, opts)}
    />,
  )
}

function MsaSvg({
  model,
  theme,
  Context,
  layout,
}: {
  model: MsaViewModel
  theme: Theme
  Context: typeof ContextType
  layout: Layout
}) {
  const { width, height, trackHeight, includeMinimap, legendWidth } = layout
  const { treeAreaWidth, minimapHeight } = model
  const totalWidth = width + legendWidth
  const legendTop = includeMinimap ? minimapHeight : 0
  const contrastScheme = colorContrast(model.colorScheme, theme)
  const props = { Context, model, theme, layout, contrastScheme }

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
      {includeMinimap ? (
        <>
          <g transform={`translate(${treeAreaWidth} 0)`}>
            <MinimapSVG model={model} />
          </g>
          <g transform={`translate(0 ${minimapHeight})`}>{body}</g>
        </>
      ) : (
        body
      )}
      {legendWidth > 0 ? (
        <g transform={`translate(${width} ${legendTop})`}>
          <LegendSVG model={model} theme={theme} width={legendWidth} />
        </g>
      ) : null}
    </svg>
  )
}

// the domain color key drawn as a reserved column to the right of the
// alignment, mirroring the on-screen AnnotationLegend overlay
function LegendSVG({
  model,
  theme,
  width,
}: {
  model: MsaViewModel
  theme: Theme
  width: number
}) {
  const { visibleDomainTypes, fillPalette, strokePalette } = model
  const boxHeight = LEGEND_PAD * 2 + visibleDomainTypes.length * LEGEND_ROW_H
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
        stroke="#ccc"
        rx={2}
      />
      {visibleDomainTypes.map((d, i) => {
        const y = LEGEND_PAD + i * LEGEND_ROW_H
        return (
          <g key={d.accession}>
            <rect
              x={LEGEND_PAD}
              y={y}
              width={LEGEND_SWATCH}
              height={LEGEND_SWATCH}
              fill={fillPalette[d.accession]}
              stroke={strokePalette[d.accession]}
            />
            <text
              x={LEGEND_TEXT_X}
              y={y + LEGEND_SWATCH - 1}
              fontSize={LEGEND_FONT}
              fill={theme.palette.text.primary}
            >
              {d.name.length > maxChars
                ? `${d.name.slice(0, Math.max(1, maxChars - 1))}…`
                : d.name}
            </text>
          </g>
        )
      })}
    </g>
  )
}

interface LayerProps {
  model: MsaViewModel
  theme: Theme
  layout: Layout
  Context: typeof ContextType
  contrastScheme: Record<string, string>
}

function CoreRendering({
  model,
  theme,
  layout,
  Context,
  contrastScheme,
}: LayerProps) {
  const { contentHeight, offsetX, offsetY, msaAreaWidth } = layout
  const { treeAreaWidth, id } = model

  const treeCtx = new Context(treeAreaWidth, contentHeight)
  renderTreeCanvas({
    model,
    theme,
    ctx: treeCtx,
    offsetY,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
  })

  const msaCtx = new Context(msaAreaWidth, contentHeight)
  renderBoxFeatureCanvasBlock({
    model,
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
    contrastScheme,
    offsetX,
    offsetY,
    blockSizeXOverride: msaAreaWidth,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
  })

  return (
    <>
      <ClipGroup
        clipId={`tree-${id}`}
        width={treeAreaWidth}
        height={contentHeight}
        ctx={treeCtx}
      />
      <ClipGroup
        clipId={`msa-${id}`}
        width={msaAreaWidth}
        height={contentHeight}
        transform={`translate(${treeAreaWidth} 0)`}
        ctx={msaCtx}
      />
    </>
  )
}

function TrackRendering({
  model,
  theme,
  layout,
  Context,
  contrastScheme,
}: LayerProps) {
  const { trackHeight, offsetX, msaAreaWidth } = layout
  const { treeAreaWidth, id } = model

  const ctx = new Context(msaAreaWidth, trackHeight)
  renderAllTracks({
    model,
    ctx,
    contrastScheme,
    theme,
    offsetX,
    blockSizeXOverride: msaAreaWidth,
    highResScaleFactorOverride: 1,
  })

  return (
    <g transform={`translate(${treeAreaWidth} 0)`}>
      <ClipGroup
        clipId={`tracks-${id}`}
        width={msaAreaWidth}
        height={trackHeight}
        ctx={ctx}
      />
    </g>
  )
}

// Clips a svgcanvas Context to its box and injects its markup verbatim (it is
// already serialized SVG, not React).
function ClipGroup({
  clipId,
  width,
  height,
  transform,
  ctx,
}: {
  clipId: string
  width: number
  height: number
  transform?: string
  ctx: ContextType
}) {
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>
      </defs>
      <g
        clipPath={`url(#${clipId})`}
        transform={transform}
        dangerouslySetInnerHTML={{ __html: ctx.getSvg().innerHTML }}
      />
    </>
  )
}
