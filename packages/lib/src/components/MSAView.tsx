import React, { Suspense } from 'react'

import { observer } from 'mobx-react'

import {
  HorizontalResizeHandle,
  VerticalResizeHandle,
} from './ResizeHandles.tsx'
import Track from './Track.tsx'
import VerticalScrollbar from './VerticalScrollbar.tsx'
import Header from './header/Header.tsx'
import Minimap from './minimap/Minimap.tsx'
import MSAPanel from './msa/MSAPanel.tsx'
import { clickColor, hoverColor, selectionFill } from './overlayColors.ts'
import RowPanelHeaders from './rowpanels/RowPanelHeaders.tsx'
import RowPanels from './rowpanels/RowPanels.tsx'
import TreeOverview from './tree/TreeOverview.tsx'
import TreePanel from './tree/TreePanel.tsx'
import TreeRuler from './tree/TreeRuler.tsx'

import type { MsaViewModel } from '../model.ts'

// The band above the panels: the tree overview and scale bar, the strip
// headers, and the minimap over the alignment. The spacer stands in for the
// resize handle, so the minimap starts exactly where the alignment canvas does.
const TopArea = observer(function ({ model }: { model: MsaViewModel }) {
  const { showHorizontalScrollbar, showTreeOverview, resizeHandleWidth } = model
  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flexShrink: 0 }}>
        {showTreeOverview ? <TreeOverview model={model} /> : null}
        <TreeRuler model={model} />
      </div>
      <RowPanelHeaders model={model} />
      <div style={{ width: resizeHandleWidth, flexShrink: 0 }} />
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
    rowPanelsWidth,
    resizeHandleWidth,
    totalTrackAreaHeight,
    msaCanvasWidth,
    resolvedSelection,
  } = model

  // the selected columns, the hovered column, then the pinned one, matching
  // the alignment's own overlay
  const bands = [
    {
      start: resolvedSelection?.startCol,
      end: resolvedSelection?.endCol,
      color: selectionFill,
    },
    { start: mouseCol, end: mouseCol, color: hoverColor },
    { start: mouseClickCol, end: mouseClickCol, color: clickColor },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        left: treeAreaWidth + rowPanelsWidth + resizeHandleWidth,
        top: 0,
        width: msaCanvasWidth,
        height: totalTrackAreaHeight,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {bands.map(({ start, end, color }) =>
        start === undefined || end === undefined ? null : (
          <div
            key={color}
            style={{
              position: 'absolute',
              left: start * colWidth + scrollX,
              top: 0,
              width: (end - start + 1) * colWidth,
              height: totalTrackAreaHeight,
              backgroundColor: color,
              zIndex: 100,
            }}
          />
        ),
      )}
    </div>
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
      <RowPanels model={model} />
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
  const { height, hideHeader, viewInitialized, DialogComponent, DialogProps } =
    model

  return (
    <div>
      {viewInitialized ? (
        <>
          <div style={{ height, overflow: 'hidden' }}>
            {hideHeader ? null : <Header model={model} />}
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
