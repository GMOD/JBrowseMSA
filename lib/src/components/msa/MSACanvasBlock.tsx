import React, { useEffect, useMemo, useRef, useState } from 'react'

import { BaseTooltip } from '@jbrowse/core/ui'
import { useTheme } from '@mui/material'
import { autorun } from 'mobx'
import { observer } from 'mobx-react'

import { renderBoxFeatureCanvasBlock } from './renderBoxFeatureCanvasBlock'
import { renderMSABlock } from './renderMSABlock'
import { colorContrast } from '../../util'

import type { MsaViewModel } from '../../model'

const MSACanvasBlock = observer(function ({
  model,
  offsetX,
  offsetY,
}: {
  model: MsaViewModel
  offsetX: number
  offsetY: number
}) {
  const {
    colWidth,
    rowHeight,
    scrollY,
    scrollX,
    colorScheme,
    blockSize,
    mouseClickCol,
    mouseClickRow,
    highResScaleFactor,
  } = model
  const theme = useTheme()

  const contrastScheme = useMemo(
    () => colorContrast(colorScheme, theme),
    [colorScheme, theme],
  )

  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) {
      return
    }
    return autorun(() => {
      ctx.resetTransform()
      ctx.clearRect(
        0,
        0,
        blockSize * highResScaleFactor,
        blockSize * highResScaleFactor,
      )
      const { actuallyShowDomains } = model
      if (actuallyShowDomains) {
        renderBoxFeatureCanvasBlock({
          ctx,
          offsetX,
          offsetY,
          model,
        })
      }
      renderMSABlock({
        ctx,
        theme,
        offsetX,
        offsetY,
        contrastScheme,
        model,
      })
    })
  }, [
    model,
    offsetX,
    offsetY,
    theme,
    blockSize,
    highResScaleFactor,
    contrastScheme,
  ])

  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>()
  const { hoveredInsertion } = model

  return (
    <>
      <canvas
        ref={ref}
        onMouseMove={event => {
          if (!ref.current) {
            return
          }
          setMousePosition({ x: event.clientX, y: event.clientY })
          const { left, top } = ref.current.getBoundingClientRect()
          const mouseX = event.clientX - left + offsetX
          const mouseY = event.clientY - top + offsetY
          const x = Math.floor(mouseX / colWidth)
          const y = Math.floor(mouseY / rowHeight)

          // Only set mouse position if within valid MSA bounds
          if (x >= 0 && x < model.numColumns && y >= 0 && y < model.numRows) {
            model.setMousePos(x, y)
          } else {
            // Clear mouse position when outside bounds
            model.setMousePos(undefined, undefined)
          }
        }}
        onClick={event => {
          if (!ref.current) {
            return
          }
          const { left, top } = ref.current.getBoundingClientRect()
          const mouseX = event.clientX - left + offsetX
          const mouseY = event.clientY - top + offsetY
          const x = Math.floor(mouseX / colWidth)
          const y = Math.floor(mouseY / rowHeight)
          if (x === mouseClickCol && y === mouseClickRow) {
            model.setMouseClickPos(undefined, undefined)
          } else {
            model.setMouseClickPos(x, y)
          }
        }}
        onMouseLeave={() => {
          model.setMousePos()
          setMousePosition(undefined)
        }}
        width={blockSize * highResScaleFactor}
        height={blockSize * highResScaleFactor}
        style={{
          position: 'absolute',
          top: scrollY + offsetY,
          left: scrollX + offsetX,
          width: blockSize,
          height: blockSize,
        }}
      />
      {hoveredInsertion && mousePosition ? (
        <BaseTooltip
          clientPoint={{ x: mousePosition.x, y: mousePosition.y + 15 }}
        >
          Insertion ({hoveredInsertion.letters.length}bp):{' '}
          {hoveredInsertion.letters.length > 20
            ? `${hoveredInsertion.letters.slice(0, 20)}...`
            : hoveredInsertion.letters}
        </BaseTooltip>
      ) : null}
    </>
  )
})

export default MSACanvasBlock
