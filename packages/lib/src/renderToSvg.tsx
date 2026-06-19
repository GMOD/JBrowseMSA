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
export async function renderToSvg(model: MsaViewModel, opts: ExportSvgOptions) {
  await when(() => model.dataInitialized)
  const {
    width,
    height,
    scrollX,
    scrollY,
    totalTrackAreaHeight,
    minimapHeight,
  } = model
  const { exportType, theme, includeTracks } = opts
  const trackHeight = includeTracks ? totalTrackAreaHeight : 0
  // the minimap reflects the live viewport scroll position, so it's only
  // meaningful for a viewport export, never for the entire alignment
  const includeMinimap = exportType === 'viewport' && !!opts.includeMinimap

  if (exportType === 'entire') {
    return render({
      width: model.totalWidth + model.treeAreaWidth,
      height: model.totalHeight + trackHeight,
      contentHeight: model.totalHeight,
      trackHeight,
      theme,
      model,
      offsetY: 0,
      offsetX: 0,
      includeMinimap,
      includeTracks,
    })
  }
  return render({
    width,
    height: height + (includeMinimap ? minimapHeight : 0) + trackHeight,
    contentHeight: height,
    trackHeight,
    theme,
    model,
    offsetY: -scrollY,
    offsetX: -scrollX,
    includeMinimap,
    includeTracks,
  })
}

async function render({
  width,
  height,
  contentHeight,
  trackHeight,
  offsetX,
  offsetY,
  theme,
  model,
  includeMinimap,
  includeTracks,
}: {
  width: number
  height: number
  contentHeight: number
  trackHeight: number
  offsetX: number
  offsetY: number
  theme: Theme
  model: MsaViewModel
  includeMinimap?: boolean
  includeTracks?: boolean
}) {
  const { Context } = await import('@jbrowse/svgcanvas')
  const { treeAreaWidth, minimapHeight } = model

  const content = (
    <>
      {includeTracks && trackHeight > 0 ? (
        <TrackRendering
          Context={Context}
          model={model}
          theme={theme}
          offsetX={offsetX}
          msaAreaWidth={width - treeAreaWidth}
          trackHeight={trackHeight}
        />
      ) : null}
      <g
        transform={trackHeight > 0 ? `translate(0 ${trackHeight})` : undefined}
      >
        <CoreRendering
          Context={Context}
          model={model}
          theme={theme}
          offsetX={offsetX}
          offsetY={offsetY}
          msaAreaWidth={width - treeAreaWidth}
          contentHeight={contentHeight}
        />
      </g>
    </>
  )

  return renderToStaticMarkup(
    <SvgWrapper width={width} height={height}>
      {includeMinimap ? (
        <>
          <g transform={`translate(${treeAreaWidth} 0)`}>
            <MinimapSVG model={model} />
          </g>
          <g transform={`translate(0 ${minimapHeight})`}>{content}</g>
        </>
      ) : (
        content
      )}
    </SvgWrapper>,
  )
}

function CoreRendering({
  model,
  theme,
  msaAreaWidth,
  contentHeight,
  offsetX,
  offsetY,
  Context,
}: {
  model: MsaViewModel
  theme: Theme
  msaAreaWidth: number
  contentHeight: number
  offsetX: number
  offsetY: number
  Context: typeof ContextType
}) {
  const { treeAreaWidth, colorScheme, id } = model
  const clipId1 = `tree-${id}`
  const clipId2 = `msa-${id}`
  const contrastScheme = colorContrast(colorScheme, theme)

  const ctx1 = new Context(treeAreaWidth, contentHeight)
  const ctx2 = new Context(msaAreaWidth, contentHeight)
  renderBoxFeatureCanvasBlock({
    ctx: ctx2,
    offsetX,
    offsetY,
    model,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
  })
  renderTreeCanvas({
    model,
    offsetY,
    ctx: ctx1,
    theme,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
  })
  renderMSABlock({
    model,
    theme,
    offsetY,
    offsetX,
    contrastScheme,
    ctx: ctx2,
    blockSizeXOverride: msaAreaWidth,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
  })
  return (
    <>
      <defs>
        <clipPath id={clipId1}>
          <rect x={0} y={0} width={treeAreaWidth} height={contentHeight} />
        </clipPath>
        <clipPath id={clipId2}>
          <rect x={0} y={0} width={msaAreaWidth} height={contentHeight} />
        </clipPath>
      </defs>

      <ClipGroup clipId={clipId1} html={ctx1.getSvg().innerHTML} />
      <ClipGroup
        clipId={clipId2}
        transform={`translate(${treeAreaWidth} 0)`}
        html={ctx2.getSvg().innerHTML}
      />
    </>
  )
}

// Wraps SVG markup produced by a svgcanvas Context in a clipped group. The
// markup is injected verbatim since it's already serialized SVG, not React.
function ClipGroup({
  clipId,
  html,
  transform,
}: {
  clipId: string
  html: string
  transform?: string
}) {
  return (
    <g
      clipPath={`url(#${clipId})`}
      transform={transform}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function TrackRendering({
  model,
  theme,
  msaAreaWidth,
  trackHeight,
  offsetX,
  Context,
}: {
  model: MsaViewModel
  theme: Theme
  msaAreaWidth: number
  trackHeight: number
  offsetX: number
  Context: typeof ContextType
}) {
  const { treeAreaWidth, colorScheme, id } = model
  const clipId = `tracks-${id}`
  const contrastScheme = colorContrast(colorScheme, theme)

  const ctx = new Context(msaAreaWidth, trackHeight)

  renderAllTracks({
    model,
    ctx,
    offsetX,
    contrastScheme,
    blockSizeXOverride: msaAreaWidth,
    highResScaleFactorOverride: 1,
  })

  return (
    <g transform={`translate(${treeAreaWidth} 0)`}>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={msaAreaWidth} height={trackHeight} />
        </clipPath>
      </defs>
      <ClipGroup clipId={clipId} html={ctx.getSvg().innerHTML} />
    </g>
  )
}

function SvgWrapper({
  width,
  height,
  children,
}: {
  width: number
  height: number
  children: React.ReactNode
}) {
  return (
    <svg
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect width="100%" height="100%" fill="white" />
      {children}
    </svg>
  )
}
