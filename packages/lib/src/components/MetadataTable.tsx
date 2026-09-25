import React from 'react'

import { makeStyles } from '@jbrowse/core/util/tss-react'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'

const useStyles = makeStyles()({
  key: {
    fontWeight: 'bold',
    verticalAlign: 'top',
  },
  value: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isEmpty(value: unknown) {
  return isRecord(value) && Object.keys(value).length === 0
}

export default function MetadataTable({
  record,
}: {
  record: Record<string, unknown>
}) {
  const { classes } = useStyles()
  return (
    <Table size="small">
      <TableBody>
        {Object.entries(record)
          .filter(([, value]) => value != null && !isEmpty(value))
          .map(([key, value]) => (
            <TableRow key={key}>
              <TableCell component="th" className={classes.key}>
                {key}
              </TableCell>
              <TableCell className={classes.value}>
                {isRecord(value) ? (
                  <MetadataTable record={value} />
                ) : Array.isArray(value) ? (
                  value.join('\n')
                ) : (
                  String(value)
                )}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  )
}
