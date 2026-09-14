import { useState } from 'react'

import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { MSAViewer } from 'react-msaview'

import { insulinMSA } from './data'

// A purpose-built page usually wants less than the standalone app shows, and
// wants its own controls on what is left. Every toggle here is a prop: the
// viewer follows them on the mounted model, so flipping one costs nothing and
// re-fetches nothing, and none of it needs the model API.
//
// `drawTree={false}` with `autoTreeAreaWidth` is the pairing to reach for when
// there is no tree to draw — the gutter shrinks to the labels instead of
// reserving its full default width for a phylogeny that never appears.
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
