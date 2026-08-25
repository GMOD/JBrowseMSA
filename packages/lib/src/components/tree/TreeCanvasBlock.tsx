import React, { useState } from 'react'

import { makeStyles } from '@jbrowse/core/util/tss-react'
import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'
import { createPortal } from 'react-dom'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import TreeBranchMenu from './TreeBranchMenu.tsx'
import TreeNodeMenu from './TreeNodeMenu.tsx'
import { padding, renderTreeCanvas } from './renderTreeCanvas.ts'
import { useTreeHover } from './useTreeHover.ts'

import type { MsaViewModel } from '../../model.ts'

const useStyles = makeStyles()(theme => ({
  tooltip: {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 10000,
    backgroundColor: theme.palette.grey[700],
    color: theme.palette.common.white,
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    whiteSpace: 'nowrap',
    maxWidth: 300,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  hover: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 100,
    background: 'rgba(0,0,0,0.1)',
  },
}))

interface MenuData {
  name: string
  id: string
  x: number
  y: number
}

const TreeCanvasBlock = observer(function ({
  model,
  offsetY,
}: {
  model: MsaViewModel
  offsetY: number
}) {
  const { classes } = useStyles()
  const theme = useTheme()
  const [branchMenu, setBranchMenu] = useState<MenuData>()
  const [nodeMenu, setNodeMenu] = useState<MenuData>()
  const { clickMap, hovered, hitTest, onMouseMove, onMouseLeave } =
    useTreeHover({ model, offsetY })

  const { treeAreaWidth, blockSize, highResScaleFactor } = model
  const width = treeAreaWidth + padding
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
      {branchMenu ? (
        <TreeBranchMenu
          node={branchMenu}
          model={model}
          onClose={() => {
            setBranchMenu(undefined)
          }}
        />
      ) : null}

      {nodeMenu ? (
        <TreeNodeMenu
          node={nodeMenu}
          model={model}
          onClose={() => {
            setNodeMenu(undefined)
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
            const menu = {
              x: event.clientX,
              y: event.clientY,
              id: entry.id,
              name: entry.name,
            }
            if (entry.branch) {
              setBranchMenu(menu)
            } else {
              setNodeMenu(menu)
            }
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

      {/* portaled: the block set sits under a transform, which would otherwise
      make this fixed tooltip position against the scrolled tree instead of the
      window */}
      {hovered
        ? createPortal(
            <div
              className={classes.tooltip}
              style={{ left: hovered.clientX + 12, top: hovered.clientY + 12 }}
            >
              {hovered.name}
            </div>,
            document.body,
          )
        : null}
    </>
  )
})

export default TreeCanvasBlock
