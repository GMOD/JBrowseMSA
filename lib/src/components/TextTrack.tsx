import React, { useEffect, useMemo, useRef } from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { colorContrast } from '../util'

import type { MsaViewModel } from '../model'
import type { BasicTrack } from '../types'

const AnnotationBlock = observer(function ({
  track,
  model,
  offsetX,
}: {
  track: BasicTrack
  model: MsaViewModel
  offsetX: number
}) {
  const {
    blockSize,
    scrollX,
    bgColor,
    colorScheme: modelColorScheme,
    colWidth,
    fontSize,
    rowHeight,
    highResScaleFactor,
  } = model
  const {
    model: { customColorScheme, data },
  } = track

  const colorScheme = customColorScheme || modelColorScheme
  const theme = useTheme()
  const ref = useRef<HTMLCanvasElement>(null)
  const contrastScheme = useMemo(
    () => colorContrast(colorScheme, theme),
    [colorScheme, theme],
  )
  useEffect(() => {
    if (!ref.current) {
      return
    }

    const ctx = ref.current.getContext('2d')
    if (!ctx) {
      return
    }

    // this logic is very similar to MSACanvas
    ctx.resetTransform()
    ctx.scale(highResScaleFactor, highResScaleFactor)
    ctx.clearRect(0, 0, blockSize, rowHeight)
    ctx.translate(-offsetX, 0)
    ctx.textAlign = 'center'
    ctx.font = ctx.font.replace(/\d+px/, `${fontSize}px`)

    const xStart = Math.max(0, Math.floor(offsetX / colWidth))
    const xEnd = Math.max(0, Math.ceil((offsetX + blockSize) / colWidth))
    const str = data?.slice(xStart, xEnd)
    for (let i = 0; str && i < str.length; i++) {
      const letter = str[i]!
      const color = colorScheme[letter.toUpperCase()]
      if (bgColor) {
        const x = i * colWidth + offsetX - (offsetX % colWidth)
        ctx.fillStyle = color || 'white'
        ctx.fillRect(x, 0, colWidth, rowHeight)
        if (rowHeight >= 10 && colWidth >= rowHeight / 2) {
          ctx.fillStyle = contrastScheme[letter.toUpperCase()] || 'black'
          ctx.fillText(letter, x + colWidth / 2, rowHeight / 2 + 1) // +1 to avoid cutoff at height:10
        }
      }
    }
  }, [
    fontSize,
    bgColor,
    blockSize,
    colWidth,
    rowHeight,
    offsetX,
    contrastScheme,
    colorScheme,
    highResScaleFactor,
    data,
  ])
  return (
    <canvas
      ref={ref}
      height={rowHeight * highResScaleFactor}
      width={blockSize * highResScaleFactor}
      style={{
        position: 'absolute',
        left: scrollX + offsetX,
        width: blockSize,
        height: rowHeight,
      }}
    />
  )
})
const AnnotationTrack = observer(function ({
  track,
  model,
}: {
  track: BasicTrack
  model: MsaViewModel
}) {
  const { blocksX, msaAreaWidth, rowHeight } = model
  return (
    <div
      style={{
        position: 'relative',
        height: rowHeight,
        width: msaAreaWidth,
        overflow: 'hidden',
      }}
    >
      {blocksX.map(bx => (
        <AnnotationBlock key={bx} track={track} model={model} offsetX={bx} />
      ))}
    </div>
  )
})

export default AnnotationTrack
