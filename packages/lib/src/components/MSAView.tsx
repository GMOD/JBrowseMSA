import React, { Suspense } from 'react'

import { observer } from 'mobx-react'

import { HorizontalResizeHandle, VerticalResizeHandle } from './ResizeHandles.tsx'
import Track from './Track.tsx'
import VerticalScrollbar from './VerticalScrollbar.tsx'
import Header from './header/Header.tsx'
import Minimap from './minimap/Minimap.tsx'
import MSAPanel from './msa/MSAPanel.tsx'
import TreePanel from './tree/TreePanel.tsx'
import TreeRuler from './tree/TreeRuler.tsx'

import type { MsaViewModel } from '../model.ts'

const TopArea = observer(function ({ model }: { model: MsaViewModel }) {
  const { showHorizontalScrollbar } = model
  return (
    <div style={{ display: 'flex' }}>
      <TreeRuler model={model} />
      {showHorizontalScrollbar ? <Minimap model={model} /> : null}
    </div>
  )
})

const TrackColumnIndicator = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const {
    mouseCol,
    mouseClickCol,
    colWidth,
    scrollX,
    treeAreaWidth,
    resizeHandleWidth,
    totalTrackAreaHeight,
  } = model

  const left = treeAreaWidth + resizeHandleWidth

  return (
    <>
      {mouseCol !== undefined ? (
        <div
          style={{
            position: 'absolute',
            left: left + mouseCol * colWidth + scrollX,
            top: 0,
            width: colWidth,
            height: totalTrackAreaHeight,
            backgroundColor: 'rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        />
      ) : null}
      {mouseClickCol !== undefined ? (
        <div
          style={{
            position: 'absolute',
            left: left + mouseClickCol * colWidth + scrollX,
            top: 0,
            width: colWidth,
            height: totalTrackAreaHeight,
            backgroundColor: 'rgba(128,128,0,0.2)',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        />
      ) : null}
    </>
  )
})

const TrackArea = observer(function ({ model }: { model: MsaViewModel }) {
  const { turnedOnTracks } = model
  if (turnedOnTracks.length === 0) {
    return null
  }
  return (
    <div style={{ position: 'relative' }}>
      <TrackColumnIndicator model={model} />
      {turnedOnTracks.map(track => (
        <Track key={track.model.id} model={model} track={track} />
      ))}
    </div>
  )
})

const MainArea = observer(function ({ model }: { model: MsaViewModel }) {
  const { showVerticalScrollbar } = model

  return (
    <div style={{ display: 'flex' }}>
      <TreePanel model={model} />
      <VerticalResizeHandle model={model} />
      <MSAPanel model={model} />
      {showVerticalScrollbar ? <VerticalScrollbar model={model} /> : null}
    </div>
  )
})

const View = observer(function ({ model }: { model: MsaViewModel }) {
  return (
    <div style={{ position: 'relative' }}>
      <TopArea model={model} />
      <TrackArea model={model} />
      <MainArea model={model} />
    </div>
  )
})

const MSAView = observer(function ({ model }: { model: MsaViewModel }) {
  const { height, viewInitialized, DialogComponent, DialogProps } = model
  return (
    <div>
      {viewInitialized ? (
        <>
          <div style={{ height, overflow: 'hidden' }}>
            <Header model={model} />
            <View model={model} />
          </div>
          <HorizontalResizeHandle model={model} />

          {DialogComponent ? (
            <Suspense fallback={null}>
              <DialogComponent {...DialogProps} />
            </Suspense>
          ) : null}
        </>
      ) : null}
    </div>
  )
})

export default MSAView
