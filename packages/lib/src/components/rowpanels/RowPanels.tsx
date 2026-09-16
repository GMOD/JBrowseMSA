import React, { useCallback, useRef } from 'react'

import { observer } from 'mobx-react'

import { useWheelScroll } from '../../useWheelScroll.ts'
import RowPanelBlock from './RowPanelBlock.tsx'

import type { MsaViewModel } from '../../model.ts'
import type { ResolvedRowPanel } from '../../types.ts'

const RowPanel = observer(function ({
  model,
  panel,
}: {
  model: MsaViewModel
  panel: ResolvedRowPanel
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { height, blocksY, scrollY } = model
  const onScrollY = useCallback(
    (d: number) => {
      model.doScrollY(d)
    },
    [model],
  )
  const { onMouseDown, onMouseUp } = useWheelScroll({ ref, onScrollY })

  return (
    <div
      ref={ref}
      data-testid={`rowpanel_${panel.id}`}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={{
        height,
        width: panel.width,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* one transform for the whole block set, matching TreeCanvas: the
      strips scroll in lockstep with the tree and the alignment */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translateY(${scrollY}px)`,
          willChange: 'transform',
        }}
      >
        {blocksY.map(block => (
          <RowPanelBlock
            key={block}
            model={model}
            panel={panel}
            offsetY={block}
          />
        ))}
      </div>
    </div>
  )
})

const RowPanels = observer(function ({ model }: { model: MsaViewModel }) {
  const { resolvedRowPanels } = model
  return resolvedRowPanels.length > 0 ? (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      {resolvedRowPanels.map(panel => (
        <RowPanel key={panel.id} model={model} panel={panel} />
      ))}
    </div>
  ) : null
})

export default RowPanels
