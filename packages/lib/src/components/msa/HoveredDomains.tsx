import React from 'react'

import { observer } from 'mobx-react'

import { msaOverlayZIndex } from '../../constants.ts'
import SpanTint from './SpanTint.tsx'
import { markOverlaySource } from './renderBoxFeatureCanvasBlock.ts'

import type { MsaViewModel } from '../../model.ts'

const HoveredDomains = observer(function ({ model }: { model: MsaViewModel }) {
  const {
    actuallyShowDomains,
    mouseOverDomains,
    mouseRow,
    leaves,
    scrollX,
    scrollY,
    rowHeight,
    msaCanvasWidth,
    msaAreaHeight,
  } = model
  const leaf = mouseRow === undefined ? undefined : leaves[mouseRow]
  return actuallyShowDomains && leaf && mouseOverDomains.length > 0 ? (
    <>
      {model.resolvedMarks.map(mark => (
        <SpanTint
          key={mark.index}
          source={markOverlaySource(model, mark, [leaf]).source}
          annotations={mouseOverDomains}
          width={msaCanvasWidth}
          height={msaAreaHeight}
          transform={`translate(${scrollX} ${scrollY + rowHeight / 2})`}
          zIndex={msaOverlayZIndex}
        />
      ))}
    </>
  ) : null
})

export default HoveredDomains
