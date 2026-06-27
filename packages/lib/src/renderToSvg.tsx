/* eslint-disable react-refresh/only-export-components */
import React from 'react'

import { renderToStaticMarkup } from '@jbrowse/core/util'
import { when } from 'mobx'

import MinimapSVG from './components/minimap/MinimapSVG.tsx'
import { renderBoxFeatureCanvasBlock } from './components/msa/renderBoxFeatureCanvasBlock.ts'
import { renderMSABlock } from './components/msa/renderMSABlock.ts'
import { renderAllTracks } from './components/tracks/renderTracksSvg.ts'
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
const LEGEND_TITLE_H = 20
const LEGEND_FONT = 12
const LEGEND_CHAR_W = 7

function getLegendWidth(model: MsaViewModel) {
  const names = model.visibleDomainTypes.map(d => d.name)
  const maxLen = Math.max(0, ...names.map(n => n.length))
  const w = LEGEND_PAD * 2 + LEGEND_SWATCH + 6 + maxLen * LEGEND_CHAR_W
  return Math.min(360, Math.max(120, w))
}

// resolved sizes/offsets (in svg user units) for the chosen export, shared by
// every layer; 'entire' renders the whole alignment unscrolled, 'viewport'
// mirrors the live scroll position
interface Layout {
  width: number
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
    width,
    height,
    scrollX,
    scrollY,
    totalWidth,
    totalHeight,
    treeAreaWidth,
    totalTrackAreaHeight,
    minimapHeight,
  } = model
  const trackHeight = opts.includeTracks ? totalTrackAreaHeight : 0
  // the minimap reflects the live viewport scroll position, so it's only
  // meaningful for a viewport export, never for the entire alignment
  const includeMinimap = opts.exportType === 'viewport' && !!opts.includeMinimap
  const legendWidth =
    model.actuallyShowDomains && model.visibleDomainTypes.length > 0
      ? getLegendWidth(model)
      : 0

  // width stays content-only (the renderers derive msaAreaWidth from it); the
  // legend occupies an extra column added at the svg root in MsaSvg
  return opts.exportType === 'entire'
    ? {
        width: totalWidth + treeAreaWidth,
        height: totalHeight + trackHeight,
        contentHeight: totalHeight,
        trackHeight,
        offsetX: 0,
        offsetY: 0,
        includeMinimap,
        legendWidth,
      }
    : {
        width,
        height: height + (includeMinimap ? minimapHeight : 0) + trackHeight,
        contentHeight: height,
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

  const body = (
    <>
      {trackHeight > 0 ? (
        <TrackRendering
          Context={Context}
          model={model}
          theme={theme}
          layout={layout}
        />
      ) : null}
      <g
        transform={trackHeight > 0 ? `translate(0 ${trackHeight})` : undefined}
      >
        <CoreRendering
          Context={Context}
          model={model}
          theme={theme}
          layout={layout}
        />
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
      <rect width="100%" height="100%" fill="white" />
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
          <LegendSVG model={model} width={legendWidth} />
        </g>
      ) : null}
    </svg>
  )
}

// the domain color key drawn as a reserved column to the right of the
// alignment, mirroring the on-screen DomainLegend overlay
function LegendSVG({ model, width }: { model: MsaViewModel; width: number }) {
  const { visibleDomainTypes, fillPalette, strokePalette } = model
  const boxHeight =
    LEGEND_PAD * 2 + LEGEND_TITLE_H + visibleDomainTypes.length * LEGEND_ROW_H
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={width - 4}
        height={boxHeight}
        fill="white"
        stroke="#ccc"
        rx={2}
      />
      <text
        x={LEGEND_PAD}
        y={LEGEND_PAD + LEGEND_FONT}
        fontSize={LEGEND_FONT}
        fontWeight="bold"
      >
        Domains ({visibleDomainTypes.length})
      </text>
      {visibleDomainTypes.map((d, i) => {
        const y = LEGEND_PAD + LEGEND_TITLE_H + i * LEGEND_ROW_H
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
              x={LEGEND_PAD + LEGEND_SWATCH + 6}
              y={y + LEGEND_SWATCH - 1}
              fontSize={LEGEND_FONT}
            >
              {d.name}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function CoreRendering({
  model,
  theme,
  layout,
  Context,
}: {
  model: MsaViewModel
  theme: Theme
  layout: Layout
  Context: typeof ContextType
}) {
  const { contentHeight, offsetX, offsetY, width } = layout
  const { treeAreaWidth, colorScheme, id } = model
  const msaAreaWidth = width - treeAreaWidth
  const contrastScheme = colorContrast(colorScheme, theme)

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
}: {
  model: MsaViewModel
  theme: Theme
  layout: Layout
  Context: typeof ContextType
}) {
  const { trackHeight, offsetX, width } = layout
  const { treeAreaWidth, colorScheme, id } = model
  const msaAreaWidth = width - treeAreaWidth
  const contrastScheme = colorContrast(colorScheme, theme)

  const ctx = new Context(msaAreaWidth, trackHeight)
  renderAllTracks({
    model,
    ctx,
    contrastScheme,
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
        // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml
        dangerouslySetInnerHTML={{ __html: ctx.getSvg().innerHTML }}
      />
    </>
  )
}
