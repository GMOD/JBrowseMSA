import React from 'react'

import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { IconButton, Paper, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const AnnotationLegend = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const {
    actuallyShowDomains,
    visibleDomainTypes: visible,
    fillPalette,
    showDomainLegend: expanded,
  } = model
  const ExpandIcon = expanded ? ExpandLess : ExpandMore

  return actuallyShowDomains && visible.length > 0 ? (
    <Paper
      elevation={3}
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        zIndex: 100,
        maxWidth: 220,
        maxHeight: '60%',
        display: 'flex',
        flexDirection: 'column',
        opacity: 0.95,
      }}
    >
      <IconButton
        size="small"
        title={expanded ? 'Collapse key' : 'Expand key'}
        style={
          expanded
            ? { position: 'absolute', top: 0, right: 0, padding: 1 }
            : { padding: 1 }
        }
        onClick={() => {
          model.setShowDomainLegend(!expanded)
        }}
      >
        <ExpandIcon style={{ fontSize: 14 }} />
      </IconButton>
      {expanded ? (
        <div style={{ overflow: 'auto', padding: '2px 6px 4px' }}>
          {visible.map(({ accession, name }, i) => (
            <div
              key={accession}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginRight: i === 0 ? 18 : 0,
              }}
              title={accession}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  flexShrink: 0,
                  background: fillPalette[accession],
                }}
              />
              <Typography
                variant="caption"
                noWrap
                style={{ fontSize: 10, lineHeight: 1.4 }}
              >
                {name}
              </Typography>
            </div>
          ))}
        </div>
      ) : null}
    </Paper>
  ) : null
})

export default AnnotationLegend
