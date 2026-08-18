import React, { useCallback } from 'react'

import { observer } from 'mobx-react'

import ScrollbarThumb from './ScrollbarThumb.tsx'

import type { MsaViewModel } from '../model.ts'

const width = 20

const VerticalScrollbar = observer(({ model }: { model: MsaViewModel }) => {
  const { msaAreaHeight, scrollY, totalHeight } = model
  const unit = msaAreaHeight / totalHeight
  const t = -scrollY * unit
  const b = (-scrollY + msaAreaHeight) * unit

  const onDrag = useCallback(
    (delta: number, startScroll: number) => {
      model.setScrollY(startScroll - delta / unit)
    },
    [model, unit],
  )

  return (
    <div
      style={{
        position: 'relative',
        width,
        height: msaAreaHeight,
        borderLeft: '1px solid #555',
        borderTop: '1px solid #555',
        boxSizing: 'border-box',
      }}
    >
      <ScrollbarThumb
        axis="y"
        getStart={() => model.scrollY}
        onDrag={onDrag}
        style={{
          top: Math.max(0, t),
          left: 0,
          boxSizing: 'border-box',
          width,
          height: Math.max(b - t, 20),
        }}
      />
    </div>
  )
})
export default VerticalScrollbar
