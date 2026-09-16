import React from 'react'

import { makeStyles } from '@jbrowse/core/util/tss-react'
import { createPortal } from 'react-dom'

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
}))

/**
 * A tooltip beside the pointer, portaled to the body. A panel's scroll
 * transform is a containing block, so a fixed tooltip left inside it would
 * position against the scrolled content instead of the window.
 */
export default function PortalTooltip({
  clientX,
  clientY,
  children,
}: {
  clientX: number
  clientY: number
  children: React.ReactNode
}) {
  const { classes } = useStyles()
  return createPortal(
    <div
      className={classes.tooltip}
      style={{ left: clientX + 12, top: clientY + 12 }}
    >
      {children}
    </div>,
    document.body,
  )
}
