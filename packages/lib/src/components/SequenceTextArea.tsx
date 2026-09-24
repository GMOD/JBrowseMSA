import React, { useState } from 'react'

import { makeStyles } from '@jbrowse/core/util/tss-react'
import { Button, TextField } from '@mui/material'
import { getUngappedSequence } from 'msa-parsers'

import { saveAs } from '../vendor/fileSaver.ts'
import Checkbox2 from './Checkbox2.tsx'
import CopyButton from './CopyButton.tsx'

const useStyles = makeStyles()(theme => ({
  textAreaFont: {
    fontFamily: 'Courier New',
    wordWrap: 'break-word',
  },
  dialogContent: {
    background: theme.palette.action.selected,
    margin: 4,
  },
}))

export const maxShownRecords = 100
export const maxShownChars = 200_000

function fastaRecord([name, seq]: [string, string], showGaps: boolean) {
  return `>${name}\n${showGaps ? seq : getUngappedSequence(seq)}`
}

function isAllGaps(seq: string) {
  return !/[^.-]/.test(seq)
}

/**
 * The first records of `rows` as FASTA, up to `maxShownRecords` records or
 * `maxShownChars` characters, whichever comes first. A textarea holding every
 * row of a large alignment freezes the page.
 */
export function fastaPreview(rows: [string, string][], showGaps: boolean) {
  const shown: string[] = []
  let chars = 0
  for (const row of rows) {
    if (shown.length >= maxShownRecords || chars >= maxShownChars) {
      break
    }
    const record = fastaRecord(row, showGaps)
    shown.push(record)
    chars += record.length + 1
  }
  return { text: shown.join('\n'), hidden: rows.length - shown.length }
}

export default function SequenceTextArea({ str }: { str: [string, string][] }) {
  const { classes } = useStyles()
  const [showGaps, setShowGaps] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)

  const rows = showEmpty
    ? str
    : str.filter(([, seq]) => (showGaps ? !!seq : !isAllGaps(seq)))
  const { text, hidden } = fastaPreview(rows, showGaps)
  const fullText = () => rows.map(row => fastaRecord(row, showGaps)).join('\n')
  return (
    <>
      <CopyButton text={fullText} />
      <Button
        onClick={() => {
          saveAs(
            new Blob([fullText()], { type: 'text/plain' }),
            'sequences.fasta',
          )
        }}
      >
        Download
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
        value={text}
        helperText={
          hidden > 0
            ? `Showing ${rows.length - hidden} of ${rows.length.toLocaleString()} sequences. ${hidden.toLocaleString()} more are in the copy and the download.`
            : undefined
        }
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
