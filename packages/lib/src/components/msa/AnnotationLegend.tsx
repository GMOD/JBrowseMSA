import React from 'react'

import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { IconButton, Paper, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import { legendZIndex } from '../../constants.ts'
import { legendEntries } from '../../legendSpec.ts'

import type { LegendGradient } from '../../legendSpec.ts'
import type { MsaViewModel } from '../../model.ts'

const textStyle = { fontSize: 10, lineHeight: 1.4 }

function GradientRow({
  label,
  gradient,
}: {
  label: string
  gradient: LegendGradient
}) {
  const { stops, minLabel, maxLabel } = gradient
  return (
    <div style={{ width: 120, padding: '1px 0' }}>
      {label ? (
        <Typography variant="caption" noWrap component="div" style={textStyle}>
          {label}
        </Typography>
      ) : null}
      <div
        style={{
          height: 9,
          background: `linear-gradient(to right, ${stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')})`,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" style={textStyle}>
          {minLabel}
        </Typography>
        <Typography variant="caption" style={textStyle}>
          {maxLabel}
        </Typography>
      </div>
    </div>
  )
}

const AnnotationLegend = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const { legends, showDomainLegend: expanded } = model
  const rows = legendEntries({ sections: legends })
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
              style={{ marginRight: i === 0 ? 18 : 0, pointerEvents: 'auto' }}
            >
              {row.gradient ? (
                <GradientRow label={row.label} gradient={row.gradient} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                    noWrap={row.kind !== 'note'}
                    title={
                      row.hint && row.hint !== row.label
                        ? `${row.label} (${row.hint})`
                        : row.label
                    }
                    style={{
                      ...textStyle,
                      fontWeight: row.kind === 'title' ? 'bold' : undefined,
                      fontStyle: row.kind === 'note' ? 'italic' : undefined,
                    }}
                  >
                    {row.label}
                  </Typography>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </Paper>
  ) : null
})

export default AnnotationLegend
