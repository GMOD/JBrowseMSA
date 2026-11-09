import React, { useRef } from 'react'

import BaseTooltip from '@jbrowse/core/ui/BaseTooltip'
import { observer } from 'mobx-react'

import { useCanvasTheme } from '../../darkReader.ts'
import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import { HighlightReadout } from '../HighlightReadout.tsx'
import { drawMsaRaster, rasterApplies } from './msaRaster.ts'
import { renderMSABlock } from './renderMSABlock.ts'
import { useMsaBlockMouse } from './useMsaBlockMouse.ts'

import type { MsaViewModel } from '../../model.ts'
import type { ZoomSnapshot } from '../../zoomSnapshot.ts'

const MSACanvasBlock = observer(function ({
  model,
  offsetX,
  offsetY,
}: {
  model: MsaViewModel
  offsetX: number
  offsetY: number
}) {
  const { blockSize, highResScaleFactor } = model
  const theme = useCanvasTheme()
  const { anchor, onMouseMove, onMouseDown, onClick, onMouseLeave } =
    useMsaBlockMouse({ model, offsetX, offsetY })

  const canvasSize = blockSize * highResScaleFactor
  const drawnAt = useRef<ZoomSnapshot>(undefined)
  const ref = useCanvasAutorun({
    draw: ctx => {
      // during a wheel zoom MSACanvas scales what this block drew at the
      // snapshot, so the block redraws only when a new snapshot is taken
      const snap = model.zoomSnapshot
      if (
        snap &&
        (snap === drawnAt.current ||
          snap.colWidth !== model.colWidth ||
          snap.rowHeight !== model.rowHeight)
      ) {
        return
      }
      drawnAt.current = snap
      ctx.resetTransform()
      ctx.clearRect(0, 0, canvasSize, canvasSize)
      const rasterTiles = rasterApplies(model)
      if (rasterTiles) {
        drawMsaRaster({ ctx, model, theme, offsetX, offsetY })
      }
      renderMSABlock({
        ctx,
        theme,
        offsetX,
        offsetY,
        model,
        rasterTiles,
        domains: true,
      })
    },
    width: canvasSize,
    height: canvasSize,
    deps: [model, offsetX, offsetY, theme],
  })

  const { hoveredInsertion, mouseOverDomains, mouseOverHighlights } = model

  return (
    <>
      <canvas
        ref={ref}
        onMouseMove={event => {
          if (ref.current) {
            onMouseMove(event, ref.current)
          }
        }}
        onMouseDown={event => {
          if (ref.current) {
            onMouseDown(event, ref.current)
          }
        }}
        onClick={event => {
          if (ref.current) {
            onClick(event, ref.current)
          }
        }}
        onMouseLeave={() => {
          onMouseLeave()
        }}
        width={canvasSize}
        height={canvasSize}
        style={{
          position: 'absolute',
          top: offsetY,
          left: offsetX,
          width: blockSize,
          height: blockSize,
        }}
      />
      {anchor ? (
        <BaseTooltip clientPoint={anchor.clientPoint}>
          {hoveredInsertion ? (
            <>
              Insertion ({hoveredInsertion.letters.length}
              {model.sequenceType === 'amino' ? 'aa' : 'bp'}):{' '}
              {hoveredInsertion.letters.length > 20
                ? `${hoveredInsertion.letters.slice(0, 20)}...`
                : hoveredInsertion.letters}
            </>
          ) : (
            <>
              {mouseOverHighlights.map((h, i) => (
                <HighlightReadout key={`highlight-${i}`} highlight={h} />
              ))}
              {mouseOverDomains.map(d => (
                <div key={`${d.accession}-${d.start}-${d.end}`}>
                  <b>{d.name}</b> ({d.accession}) {d.start}-{d.end}
                  {d.description ? (
                    <>
                      <br />
                      {d.description}
                    </>
                  ) : null}
                </div>
              ))}
            </>
          )}
        </BaseTooltip>
      ) : null}
    </>
  )
})

export default MSACanvasBlock
