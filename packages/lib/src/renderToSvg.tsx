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
import type { Theme } from '@mui/material'
import type { Context as ContextType } from 'svgcanvas'

export interface ExportSvgOptions {
  theme: Theme
  includeMinimap?: boolean
  includeTracks?: boolean
  exportType: string
}
export async function renderToSvg(model: MsaViewModel, opts: ExportSvgOptions) {
  await when(() => !!model.dataInitialized)
  const { width, height, scrollX, scrollY, totalTrackAreaHeight } = model
  const { exportType, theme, includeMinimap, includeTracks } = opts
  const trackHeight = includeTracks ? totalTrackAreaHeight : 0

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
  if (exportType === 'viewport') {
    return render({
      width,
      height: height + (includeMinimap ? model.minimapHeight : 0) + trackHeight,
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
  throw new Error('unknown export type')
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
  const { Context } = await import('svgcanvas')
  const Wrapper = includeMinimap ? MinimapWrapper : NullWrapper

  return renderToStaticMarkup(
    <SvgWrapper width={width} height={height}>
      <Wrapper model={model}>
        {includeTracks && trackHeight > 0 ? (
          <TrackRendering
            Context={Context}
            model={model}
            theme={theme}
            offsetX={offsetX}
            width={width}
            trackHeight={trackHeight}
          />
        ) : null}
        <g
          transform={
            trackHeight > 0 ? `translate(0 ${trackHeight})` : undefined
          }
        >
          <CoreRendering
            Context={Context}
            model={model}
            theme={theme}
            offsetX={offsetX}
            offsetY={offsetY}
            width={width}
            contentHeight={contentHeight}
          />
        </g>
      </Wrapper>
    </SvgWrapper>,
  )
}

function CoreRendering({
  model,
  theme,
  width,
  contentHeight,
  offsetX,
  offsetY,
  Context,
}: {
  model: MsaViewModel
  theme: Theme
  width: number
  contentHeight: number
  offsetX: number
  offsetY: number
  Context: typeof ContextType
}) {
  const { treeAreaWidth, colorScheme, id } = model
  const clipId1 = `tree-${id}`
  const clipId2 = `msa-${id}`
  const contrastScheme = colorContrast(colorScheme, theme)

  const ctx1 = new Context(width, contentHeight) as any

  const ctx2 = new Context(width, contentHeight) as any
  renderBoxFeatureCanvasBlock({
    ctx: ctx2,
    offsetX,
    offsetY,
    model,
    blockSizeYOverride: contentHeight,
    highResScaleFactorOverride: 1,
  })
  const msaAreaWidth = width - treeAreaWidth
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
      </defs>
      <defs>
        <clipPath id={clipId2}>
          <rect x={0} y={0} width={msaAreaWidth} height={contentHeight} />
        </clipPath>
      </defs>

      <g
        clipPath={`url(#${clipId1})`}
        dangerouslySetInnerHTML={{ __html: ctx1.getSvg().innerHTML }}
      />
      <g
        clipPath={`url(#${clipId2})`}
        transform={`translate(${treeAreaWidth} 0)`}
        dangerouslySetInnerHTML={{ __html: ctx2.getSvg().innerHTML }}
      />
    </>
  )
}

function TrackRendering({
  model,
  theme,
  width,
  trackHeight,
  offsetX,
  Context,
}: {
  model: MsaViewModel
  theme: Theme
  width: number
  trackHeight: number
  offsetX: number
  Context: typeof ContextType
}) {
  const { treeAreaWidth, colorScheme, id } = model
  const clipId = `tracks-${id}`
  const contrastScheme = colorContrast(colorScheme, theme)
  const msaAreaWidth = width - treeAreaWidth

  const ctx = new Context(msaAreaWidth, trackHeight) as any

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
      <g
        clipPath={`url(#${clipId})`}
        dangerouslySetInnerHTML={{ __html: ctx.getSvg().innerHTML }}
      />
    </g>
  )
}

function MinimapWrapper({
  model,
  children,
}: {
  model: MsaViewModel
  children: React.ReactNode
}) {
  const { minimapHeight, treeAreaWidth } = model

  return (
    <>
      <g transform={`translate(${treeAreaWidth} 0)`}>
        <MinimapSVG model={model} />
      </g>

      <g transform={`translate(0 ${minimapHeight})`}>{children}</g>
    </>
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
      viewBox={[0, 0, width, height].toString()}
    >
      {children}
    </svg>
  )
}

function NullWrapper({ children }: { children: React.ReactNode }) {
  return children
}
