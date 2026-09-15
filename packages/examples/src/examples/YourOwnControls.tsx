import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { MSAViewer } from 'react-msaview'

import { globinMSA, globinTree } from './data'

import type { Cell, Viewport } from 'react-msaview'

// hideHeader leaves the viewer's toolbar out, so the page draws the controls it
// needs and nothing else. Every control below is a prop, and the viewer applies
// each one to the mounted model, so a click keeps the scroll position.
//
// onCellClick and onViewportChange report back in the coordinates highlights
// take: the column of the file and the residue of that row, both 1-based. The
// sentence under the viewer is built from them.
export default function YourOwnControls() {
  const [mode, setMode] = useState<'light' | 'dark'>('dark')
  const [colorScheme, setColorScheme] = useState('clustalx_protein_dynamic')
  const [colWidth, setColWidth] = useState(12)
  const [clicked, setClicked] = useState<Cell>()
  const [viewport, setViewport] = useState<Viewport>()

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: mode === 'dark' ? '#121212' : '#fafafa',
        color: mode === 'dark' ? '#eee' : '#222',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, value) => {
            if (value) {
              setMode(value)
            }
          }}
          sx={{ bgcolor: '#fff' }}
        >
          <ToggleButton value="light">Light</ToggleButton>
          <ToggleButton value="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          select
          size="small"
          value={colorScheme}
          onChange={event => {
            setColorScheme(event.target.value)
          }}
          sx={{ minWidth: 220, bgcolor: '#fff', borderRadius: 1 }}
        >
          <MenuItem value="clustalx_protein_dynamic">
            ClustalX (dynamic)
          </MenuItem>
          <MenuItem value="percent_identity_dynamic">Percent identity</MenuItem>
          <MenuItem value="jalview_hydrophobicity">Hydrophobicity</MenuItem>
        </TextField>
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            setColWidth(w => Math.max(2, Math.round(w / 1.5)))
          }}
        >
          Zoom out
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            setColWidth(w => Math.min(30, Math.round(w * 1.5)))
          }}
        >
          Zoom in
        </Button>
      </Stack>
      <MSAViewer
        msa={globinMSA}
        tree={globinTree}
        hideHeader
        theme={mode}
        colorScheme={colorScheme}
        colWidth={colWidth}
        height={360}
        onCellClick={setClicked}
        onViewportChange={setViewport}
      />
      <Typography variant="body2" sx={{ mt: 1.5, minHeight: '1.5em' }}>
        {viewport
          ? `Columns ${viewport.startColumn}-${viewport.endColumn} on screen. `
          : null}
        {clicked?.row
          ? clicked.residue
            ? `Clicked ${clicked.row}, residue ${clicked.residue} (${clicked.letter}), column ${clicked.column}.`
            : `Clicked a gap in ${clicked.row} at column ${clicked.column}.`
          : 'Click a residue.'}
      </Typography>
    </Box>
  )
}
