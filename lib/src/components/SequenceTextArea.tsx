import React, { useState } from 'react'

import { Button, TextField } from '@mui/material'
import copy from 'copy-to-clipboard'
import { makeStyles } from 'tss-react/mui'

import Checkbox2 from './Checkbox2'

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
  const [copied, setCopied] = useState(false)
  const [showGaps, setShowGaps] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)

  const removeGaps = (s: string) => s.replaceAll('-', '').replaceAll('.', '')
  const disp = str
    .map(([s1, s2]) => [s1, showGaps ? s2 : removeGaps(s2)] as const)
    .filter(f => (showEmpty ? true : !!f[1]))
    .map(([s1, s2]) => `>${s1}\n${showGaps ? s2 : removeGaps(s2)}`)
    .join('\n')
  return (
    <>
      <Button
        color="primary"
        variant="contained"
        onClick={() => {
          copy(disp)
          setCopied(true)
          setTimeout(() => {
            setCopied(false)
          }, 500)
        }}
      >
        {copied ? 'Copied!' : 'Copy to clipboard'}
      </Button>
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
        InputProps={{
          readOnly: true,
          classes: {
            input: classes.textAreaFont,
          },
        }}
      />
    </>
  )
}
