import React from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import {
  bracketGap,
  cladeHeight,
  cladeInGutter,
  cladeLabelHorizontal,
  cladeLabelOffset,
} from './cladeBrackets.ts'

import type { MsaViewModel } from '../../model.ts'

/**
 * The label of each bracket, in the gutter beside its bar, where the canvas
 * draws the bar itself. The text is DOM text, turned on its side for a clade
 * shorter than the font, the way the strip headers are; the SVG export draws
 * the same labels with a `rotate(-90)`.
 */
const CladeLabels = observer(function ({ model }: { model: MsaViewModel }) {
  const {
    resolvedClades,
    cladeGutterWidth,
    rowHeight,
    treeAreaWidth,
    fontSize,
  } = model
  const theme = useTheme()
  if (cladeGutterWidth === 0) {
    return null
  }
  const gutterLeft = treeAreaWidth - cladeGutterWidth
  return (
    <>
      {resolvedClades.map((clade, index) => {
        const { label, markColor, rows } = clade
        if (!label || !cladeInGutter(clade)) {
          return null
        }
        const left = gutterLeft + cladeLabelOffset(clade)
        const horizontal = cladeLabelHorizontal(clade, rowHeight, fontSize)
        return (
          <div
            key={`${rows[0]}-${rows[1]}-${index}`}
            title={label}
            style={{
              position: 'absolute',
              left,
              top: rows[0] * rowHeight,
              width: treeAreaWidth - left - bracketGap,
              height: cladeHeight(clade, rowHeight),
              display: 'flex',
              alignItems: 'center',
              color: markColor ?? theme.palette.text.primary,
              fontSize,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              // vertical-rl reads top to bottom, and the half turn makes it
              // read upwards, which is what rotate(-90) exports
              ...(horizontal
                ? {}
                : { writingMode: 'vertical-rl', transform: 'rotate(180deg)' }),
            }}
          >
            {label}
          </div>
        )
      })}
    </>
  )
})

export default CladeLabels
