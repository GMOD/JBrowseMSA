import { useState } from 'react'

import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { MSAViewer } from 'react-msaview'

import { insulinMSA } from './data'

// A page embedding one panel usually shows less than the standalone app, with
// its own controls on the rest. Every toggle here is a prop, and the viewer
// applies it to the mounted model with no remount, no refetch and no model API.
//
// With no tree to draw, `drawTree={false}` plus `autoTreeAreaWidth` sizes the
// gutter to the labels alone.
export default function PanelControls() {
  const [expanded, setExpanded] = useState(false)
  const [diff, setDiff] = useState(true)
  const [scheme, setScheme] = useState('clustalx_protein_dynamic')
  return (
    <div>
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Button
          variant={diff ? 'contained' : 'outlined'}
          size="small"
          onClick={() => {
            setDiff(d => !d)
          }}
        >
          Diff vs human
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setExpanded(e => !e)
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setScheme(s =>
              s === 'clustalx_protein_dynamic'
                ? 'maeditor'
                : 'clustalx_protein_dynamic',
            )
          }}
        >
          Color scheme
        </Button>
      </Stack>
      <MSAViewer
        msa={insulinMSA}
        colorScheme={scheme}
        relativeTo={diff ? 'Human' : undefined}
        height={expanded ? 560 : 300}
        drawTree={false}
        autoTreeAreaWidth
      />
    </div>
  )
}
