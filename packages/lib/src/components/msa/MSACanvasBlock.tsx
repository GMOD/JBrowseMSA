import React from 'react'

import BaseTooltip from '@jbrowse/core/ui/BaseTooltip'
import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import { useColorContrast } from '../../useColorContrast.ts'
import ColumnStats from './ColumnStats.tsx'
import { drawMsaRaster, rasterSupported } from './msaRaster.ts'
import { renderBoxFeatureCanvasBlock } from './renderBoxFeatureCanvasBlock.ts'
import { renderMSABlock } from './renderMSABlock.ts'
import { useMsaBlockMouse } from './useMsaBlockMouse.ts'

import type { MsaViewModel } from '../../model.ts'

const MSACanvasBlock = observer(function ({
  model,
  offsetX,
  offsetY,
}: {
  model: MsaViewModel
  offsetX: number
  offsetY: number
}) {
  const { scrollY, scrollX, colorScheme, blockSize, highResScaleFactor } = model
  const { theme, contrastScheme } = useColorContrast(colorScheme)
  const { tooltipPoint, onMouseMove, onClick, onMouseLeave } = useMsaBlockMouse(
    {
      model,
      offsetX,
      offsetY,
    },
  )

  const canvasSize = blockSize * highResScaleFactor
  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, canvasSize, canvasSize)
      renderBoxFeatureCanvasBlock({
        ctx,
        offsetX,
        offsetY,
        model,
      })
      // the alignment background comes from zoom-independent raster tiles; the
      // domain overlay paints its own boxes instead, and letter-color mode has
      // no background to paint
      const rasterTiles =
        !model.actuallyShowDomains && model.bgColor && rasterSupported()
      if (rasterTiles) {
        drawMsaRaster({ ctx, model, theme, offsetX, offsetY })
      }
      renderMSABlock({
        ctx,
        theme,
        offsetX,
        offsetY,
        contrastScheme,
        model,
        rasterTiles,
      })
    },
    width: canvasSize,
    height: canvasSize,
    deps: [model, offsetX, offsetY, theme, contrastScheme],
  })

  const { hoveredInsertion, mouseOverDomains, showColumnStats } = model

  return (
    <>
      <canvas
        ref={ref}
        onMouseMove={event => {
          if (ref.current) {
            onMouseMove(event, ref.current)
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
          top: scrollY + offsetY,
          left: scrollX + offsetX,
          width: blockSize,
          height: blockSize,
        }}
      />
      {tooltipPoint ? (
        <BaseTooltip
          clientPoint={{ x: tooltipPoint.x, y: tooltipPoint.y + 15 }}
        >
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
              {showColumnStats ? <ColumnStats model={model} /> : null}
            </>
          )}
        </BaseTooltip>
      ) : null}
    </>
  )
})

export default MSACanvasBlock
