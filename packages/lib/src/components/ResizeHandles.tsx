import React, { useCallback } from 'react'

import { observer } from 'mobx-react'

import DragHandle from './DragHandle.tsx'

import type { MsaViewModel } from '../model.ts'
import type { BasicTrack } from '../types.ts'

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

export const TrackResizeHandle = observer(function ({
  model,
  track,
}: {
  model: MsaViewModel
  track: BasicTrack
}) {
  const { id, heightKey, height } = track.model
  // tracks sharing a key resize together, so only the last turned-on one of
  // them carries the divider: a second between conservation and property
  // conservation would move the pair this one already moves. The drag divides
  // across the group, so its bottom edge follows the cursor rather than half
  const siblings = model.turnedOnTracks.filter(
    t => t.model.heightKey === heightKey,
  )
  const count = siblings.length
  const onDrag = useCallback(
    (delta: number, startHeight: number) => {
      if (heightKey) {
        model.setTrackHeight(
          heightKey,
          Math.max(10, startHeight + delta / count),
        )
      }
    },
    [model, heightKey, count],
  )
  return heightKey && siblings.at(-1)?.model.id === id ? (
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
