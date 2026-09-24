import React, { useState } from 'react'

import BaseTooltip from '@jbrowse/core/ui/BaseTooltip'
import { makeStyles } from '@jbrowse/core/util/tss-react'
import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import TreeMenu from './TreeMenu.tsx'
import { renderTreeCanvas } from './renderTreeCanvas.ts'
import { useTreeHover } from './useTreeHover.ts'

import type { MsaViewModel } from '../../model.ts'
import type { TreeMenuTarget } from './TreeMenu.tsx'

const useStyles = makeStyles()(theme => ({
  hover: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 100,
    background: theme.palette.action.hover,
  },
}))

const TreeCanvasBlock = observer(function ({
  model,
  offsetY,
}: {
  model: MsaViewModel
  offsetY: number
}) {
  const { classes } = useStyles()
  const theme = useTheme()
  const [menu, setMenu] = useState<TreeMenuTarget>()
  const { clickMap, anchor, hitTest, onMouseMove, onMouseLeave } = useTreeHover(
    { model, offsetY },
  )
  const hovered = anchor?.value

  const { treeAreaWidth, blockSize, highResScaleFactor } = model
  // TreePanel clips to treeAreaWidth, so a wider canvas is wasted backing store
  const width = treeAreaWidth
  const height = blockSize

  const canvasWidth = width * highResScaleFactor
  const canvasHeight = height * highResScaleFactor
  const ref = useCanvasAutorun({
    draw: ctx => {
      ctx.resetTransform()
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      renderTreeCanvas({
        ctx,
        model,
        offsetY,
        clickMap,
        theme,
      })
    },
    width: canvasWidth,
    height: canvasHeight,
    deps: [model, clickMap, offsetY, theme],
  })

  const style = {
    width,
    height,
    top: offsetY,
    left: 0,
    position: 'absolute',
  } as const

  return (
    <>
      {menu ? (
        <TreeMenu
          node={menu}
          model={model}
          onClose={() => {
            setMenu(undefined)
          }}
        />
      ) : null}

      <canvas
        ref={ref}
        width={canvasWidth}
        height={canvasHeight}
        style={{ ...style, cursor: hovered ? 'pointer' : 'default' }}
        onMouseMove={event => {
          onMouseMove(event)
        }}
        onMouseLeave={() => {
          onMouseLeave()
        }}
        onClick={event => {
          const entry = hitTest(event)
          if (entry) {
            setMenu({
              x: event.clientX,
              y: event.clientY,
              id: entry.id,
              name: entry.name,
              leaf: !entry.branch,
            })
          }
        }}
      />

      {/* direct-hover highlight, drawn only for leaf labels */}
      {hovered && !hovered.branch ? (
        <div
          className={classes.hover}
          style={{
            left: hovered.minX,
            top: hovered.minY,
            width: hovered.maxX - hovered.minX,
            height: hovered.maxY - hovered.minY,
          }}
        />
      ) : null}

      {anchor ? (
        <BaseTooltip clientPoint={anchor.clientPoint}>
          {anchor.value.name}
        </BaseTooltip>
      ) : null}
    </>
  )
})

export default TreeCanvasBlock
