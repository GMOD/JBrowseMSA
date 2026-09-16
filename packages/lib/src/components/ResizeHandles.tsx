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

// The tracks one handle moves together. A column track carries its own height,
// so it is a group of one; the rest share the volatile their kind writes.
function heightGroup(model: MsaViewModel, track: BasicTrack) {
  const { id, kind } = track.model
  return model.columnTracks.some(t => t.id === id) ? `own:${id}` : kind
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
  const ownHeight = model.columnTracks.some(t => t.id === id)
  // conservation and property conservation share a height, so a handle between
  // them would resize the pair the one below them already resizes. Only the
  // last turned-on track of a group carries it, and the drag spreads across
  // the group so the bottom edge follows the cursor rather than half of it
  const group = heightGroup(model, track)
  const siblings = model.turnedOnTracks.filter(
    t => heightGroup(model, t) === group,
  )
  const count = siblings.length
  const onDrag = useCallback(
    (delta: number, startHeight: number) => {
      const next = Math.max(10, startHeight + delta / count)
      if (ownHeight) {
        model.setColumnTrackHeight(id, next)
      } else {
        setTrackHeight[kind]?.(model, next)
      }
    },
    [model, id, kind, ownHeight, count],
  )
  return setHeight && siblings.at(-1)?.model.id === id ? (
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
