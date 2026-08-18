import React, { useState } from 'react'

import { makeStyles } from '@jbrowse/core/util/tss-react'
import { TextField } from '@mui/material'
import { getUngappedSequence } from 'msa-parsers'

import Checkbox2 from './Checkbox2.tsx'
import CopyButton from './CopyButton.tsx'

const useStyles = makeStyles()({
  textAreaFont: {
    fontFamily: 'Courier New',
    wordWrap: 'break-word',
  },
  dialogContent: {
    background: 'lightgrey',
    margin: 4,
    minWidth: '80em',
  },
})

export default function SequenceTextArea({ str }: { str: [string, string][] }) {
  const { classes } = useStyles()
  const [showGaps, setShowGaps] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)

  const disp = str
    .map(([s1, s2]) => [s1, showGaps ? s2 : getUngappedSequence(s2)] as const)
    .filter(([, s2]) => showEmpty || !!s2)
    .map(([s1, s2]) => `>${s1}\n${s2}`)
    .join('\n')
  return (
    <>
      <CopyButton text={disp} />
      <Checkbox2
        label="Show gaps"
        checked={showGaps}
        onChange={() => {
          setShowGaps(!showGaps)
        }}
      />
      <Checkbox2
        label="Show empty"
        checked={showEmpty}
        onChange={() => {
          setShowEmpty(!showEmpty)
        }}
      />
      <TextField
        variant="outlined"
        multiline
        className={classes.dialogContent}
        minRows={5}
        maxRows={10}
        fullWidth
        value={disp}
        slotProps={{
          input: {
            readOnly: true,
            className: classes.textAreaFont,
          },
        }}
      />
    </>
  )
}
