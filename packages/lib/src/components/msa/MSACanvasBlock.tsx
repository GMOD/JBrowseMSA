import React, { useEffect, useRef, useState } from 'react'

import { BaseTooltip } from '@jbrowse/core/ui'
import { autorun } from 'mobx'
import { observer } from 'mobx-react'

import { renderBoxFeatureCanvasBlock } from './renderBoxFeatureCanvasBlock.ts'
import { renderMSABlock } from './renderMSABlock.ts'
import { useColorContrast } from '../../useColorContrast.ts'

import type { MsaViewModel } from '../../model.ts'

function eventToColRow(
  event: React.MouseEvent,
  el: HTMLCanvasElement,
  offsetX: number,
  offsetY: number,
  colWidth: number,
  rowHeight: number,
) {
  const { left, top } = el.getBoundingClientRect()
  return {
    col: Math.floor((event.clientX - left + offsetX) / colWidth),
    row: Math.floor((event.clientY - top + offsetY) / rowHeight),
  }
}

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
  const { theme, contrastScheme } = useColorContrast(colorScheme)

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
      if (model.actuallyShowDomains) {
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
          if (ref.current) {
            const { col, row } = eventToColRow(
              event,
              ref.current,
              offsetX,
              offsetY,
              colWidth,
              rowHeight,
            )
            // Only set mouse position if within valid MSA bounds
            if (
              col >= 0 &&
              col < model.numColumns &&
              row >= 0 &&
              row < model.numRows
            ) {
              model.setMousePos(col, row)
            } else {
              model.setMousePos(undefined, undefined)
            }
            // only track client coords when an insertion is hovered (the only
            // consumer is the tooltip below); avoids a re-render on every move
            setMousePosition(
              model.hoveredInsertion
                ? { x: event.clientX, y: event.clientY }
                : undefined,
            )
          }
        }}
        onClick={event => {
          if (ref.current) {
            const { col, row } = eventToColRow(
              event,
              ref.current,
              offsetX,
              offsetY,
              colWidth,
              rowHeight,
            )
            if (col === mouseClickCol && row === mouseClickRow) {
              model.setMouseClickPos(undefined, undefined)
            } else {
              model.setMouseClickPos(col, row)
            }
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
          Insertion ({hoveredInsertion.letters.length}
          {model.sequenceType === 'amino' ? 'aa' : 'bp'}):{' '}
          {hoveredInsertion.letters.length > 20
            ? `${hoveredInsertion.letters.slice(0, 20)}...`
            : hoveredInsertion.letters}
        </BaseTooltip>
      ) : null}
    </>
  )
})

export default MSACanvasBlock
