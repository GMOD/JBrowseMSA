import React, { useState } from 'react'

import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { IconButton, Paper, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const DomainLegend = observer(function ({ model }: { model: MsaViewModel }) {
  const [expanded, setExpanded] = useState(true)
  const { actuallyShowDomains, visibleDomainTypes: visible, fillPalette } = model
  const ExpandIcon = expanded ? ExpandLess : ExpandMore

  return actuallyShowDomains && visible.length > 0 ? (
    <Paper
      elevation={3}
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        zIndex: 100,
        maxWidth: 260,
        maxHeight: '60%',
        display: 'flex',
        flexDirection: 'column',
        opacity: 0.95,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '2px 4px 2px 8px',
        }}
      >
        <IconButton
          size="small"
          onClick={() => {
            setExpanded(!expanded)
          }}
        >
          <ExpandIcon fontSize="small" />
        </IconButton>
      </div>
      {expanded ? (
        <div style={{ overflow: 'auto', padding: '0 8px 6px' }}>
          {visible.map(({ accession, name }) => (
            <div
              key={accession}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              title={accession}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  flexShrink: 0,
                  background: fillPalette[accession],
                }}
              />
              <Typography variant="caption" noWrap>
                {name}
              </Typography>
            </div>
          ))}
        </div>
      ) : null}
    </Paper>
  ) : null
})

export default DomainLegend
