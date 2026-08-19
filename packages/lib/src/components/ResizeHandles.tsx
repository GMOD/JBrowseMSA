import React, { useCallback } from 'react'

import { observer } from 'mobx-react'

import DragHandle from './DragHandle.tsx'

import type { MsaViewModel } from '../model.ts'
import type { TrackKind } from '../types.ts'

export const VerticalResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const onDrag = useCallback(
    (delta: number, startWidth: number) => {
      model.setTreeAreaWidth(startWidth + delta)
    },
    [model],
  )
  return (
    <DragHandle
      axis="x"
      variant="resizer"
      getStart={() => model.treeAreaWidth}
      onDrag={onDrag}
      style={{ width: model.resizeHandleWidth }}
    />
  )
})

export const HorizontalResizeHandle = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const onDrag = useCallback(
    (delta: number, startHeight: number) => {
      model.setHeight(startHeight + delta)
    },
    [model],
  )
  return (
    <DragHandle
      axis="y"
      variant="resizer"
      getStart={() => model.height}
      onDrag={onDrag}
      style={{ width: '100%', height: model.resizeHandleWidth }}
    />
  )
})

// The height behind each resizable track kind. Both bar tracks read one height
// so conservation and property conservation stay directly comparable; the logo
// keeps its own, being taller by default. Text tracks are absent: they are one
// alignment row tall and follow rowHeight, so the zoom controls already size
// them.
const trackHeights: Partial<
  Record<
    TrackKind,
    {
      get: (model: MsaViewModel) => number
      set: (model: MsaViewModel, height: number) => void
    }
  >
> = {
  bar: {
    get: model => model.conservationTrackHeight,
    set: (model, height) => {
      model.setConservationTrackHeight(height)
    },
  },
  logo: {
    get: model => model.sequenceLogoTrackHeight,
    set: (model, height) => {
      model.setSequenceLogoTrackHeight(height)
    },
  },
}

export const TrackResizeHandle = observer(function ({
  model,
  kind,
}: {
  model: MsaViewModel
  kind: TrackKind
}) {
  const height = trackHeights[kind]
  const onDrag = useCallback(
    (delta: number, startHeight: number) => {
      height?.set(model, Math.max(10, startHeight + delta))
    },
    [model, height],
  )
  return height ? (
    <DragHandle
      axis="y"
      variant="resizer"
      getStart={() => height.get(model)}
      onDrag={onDrag}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: model.resizeHandleWidth,
        zIndex: 1,
      }}
    />
  ) : null
})
