import React, { useState } from 'react'

import { makeStyles } from '@jbrowse/core/util/tss-react'
import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { useCanvasAutorun } from '../../useCanvasAutorun.ts'
import PortalTooltip from '../PortalTooltip.tsx'
import TreeBranchMenu from './TreeBranchMenu.tsx'
import TreeNodeMenu from './TreeNodeMenu.tsx'
import { renderTreeCanvas } from './renderTreeCanvas.ts'
import { useTreeHover } from './useTreeHover.ts'

import type { MsaViewModel } from '../../model.ts'

const useStyles = makeStyles()(theme => ({
  hover: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 100,
    background: theme.palette.action.hover,
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

      {hovered ? (
        <PortalTooltip clientX={hovered.clientX} clientY={hovered.clientY}>
          {hovered.name}
        </PortalTooltip>
      ) : null}
    </>
  )
})

export default TreeCanvasBlock
