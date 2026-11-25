import React from 'react'

import { useTheme } from '@mui/material'
import { observer } from 'mobx-react'

import { cladeLabelBoxes } from './cladeBrackets.ts'

import type { MsaViewModel } from '../../model.ts'

/**
 * The label of each bracket, in the gutter beside its bar, where the canvas
 * draws the bar itself. The text is DOM text, turned on its side for a clade
 * shorter than the font, the way the strip headers are; the SVG export draws
 * the same labels with a `rotate(-90)`.
 */
const CladeLabels = observer(function ({ model }: { model: MsaViewModel }) {
  const theme = useTheme()
  return (
    <>
      {cladeLabelBoxes(model).map(box => (
        <div
          key={box.key}
          title={box.label}
          style={{
            position: 'absolute',
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            display: 'flex',
            alignItems: 'center',
            color: box.color ?? theme.palette.text.primary,
            fontSize: box.fontSize,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            // vertical-rl reads top to bottom, and the half turn makes it
            // read upwards, which is what rotate(-90) exports
            ...(box.horizontal
              ? {}
              : { writingMode: 'vertical-rl', transform: 'rotate(180deg)' }),
          }}
        >
          {box.label}
        </div>
      ))}
    </>
  )
})

export default CladeLabels
