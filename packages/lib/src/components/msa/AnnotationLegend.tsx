import React from 'react'

import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { IconButton, Paper, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import { legendZIndex } from '../../constants.ts'
import { legendRows } from './legendRows.ts'

import type { MsaViewModel } from '../../model.ts'

const AnnotationLegend = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { legends, showDomainLegend: expanded } = model
  const rows = legendRows(legends)
  const ExpandIcon = expanded ? ExpandLess : ExpandMore

  return rows.length > 0 ? (
    <Paper
      elevation={3}
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        zIndex: legendZIndex,
        maxWidth: 220,
        maxHeight: '60%',
        display: 'flex',
        flexDirection: 'column',
        opacity: 0.95,
        pointerEvents: 'none',
      }}
    >
      <IconButton
        size="small"
        title={expanded ? 'Collapse key' : 'Expand key'}
        style={{
          padding: 1,
          pointerEvents: 'auto',
          ...(expanded && { position: 'absolute', top: 0, right: 0 }),
        }}
        onClick={() => {
          model.setShowDomainLegend(!expanded)
        }}
      >
        <ExpandIcon style={{ fontSize: 14 }} />
      </IconButton>
      {expanded ? (
        <div style={{ overflow: 'auto', padding: '2px 6px 4px' }}>
          {rows.map((row, i) => (
            <div
              key={row.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginRight: i === 0 ? 18 : 0,
              }}
            >
              {row.color ? (
                <div
                  style={{
                    width: 9,
                    height: 9,
                    flexShrink: 0,
                    background: row.color,
                  }}
                />
              ) : null}
              <Typography
                variant="caption"
                noWrap
                title={
                  row.hint && row.hint !== row.label
                    ? `${row.label} (${row.hint})`
                    : row.label
                }
                style={{
                  fontSize: 10,
                  lineHeight: 1.4,
                  fontWeight: row.color ? undefined : 'bold',
                  pointerEvents: 'auto',
                }}
              >
                {row.label}
              </Typography>
            </div>
          ))}
        </div>
      ) : null}
    </Paper>
  ) : null
})

export default AnnotationLegend
