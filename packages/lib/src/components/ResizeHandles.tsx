import React, { useCallback } from 'react'

import { observer } from 'mobx-react'

import DragHandle from './DragHandle.tsx'

import type { MsaViewModel } from '../model.ts'
import type { BasicTrack, TrackKind } from '../types.ts'

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

// The volatile behind each resizable kind of computed track. Both bar tracks
// write one height so conservation and property conservation stay directly
// comparable; the logo keeps its own, being taller by default. Text tracks are
// absent: they are one alignment row tall and follow rowHeight, so the zoom
// controls already size them.
const setTrackHeight: Partial<
  Record<TrackKind, (model: MsaViewModel, height: number) => void>
> = {
  bar: (model, height) => {
    model.setConservationTrackHeight(height)
  },
  logo: (model, height) => {
    model.setSequenceLogoTrackHeight(height)
  },
  arc: (model, height) => {
    model.setArcTrackHeight(height)
  },
}

export const TrackResizeHandle = observer(function ({
  model,
  track,
}: {
  model: MsaViewModel
  track: BasicTrack
}) {
  const { id, kind, height } = track.model
  const setHeight = setTrackHeight[kind]
  // a data track carries its own height, so its handle resizes that track --
  // dragging one used to resize every track of its kind instead
  const ownHeight = model.columnTracks.some(t => t.id === id)
  const onDrag = useCallback(
    (delta: number, startHeight: number) => {
      const next = Math.max(10, startHeight + delta)
      if (ownHeight) {
        model.setColumnTrackHeight(id, next)
      } else {
        setTrackHeight[kind]?.(model, next)
      }
    },
    [model, id, kind, ownHeight],
  )
  return setHeight ? (
    <DragHandle
      axis="y"
      variant="resizer"
      getStart={() => height}
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
