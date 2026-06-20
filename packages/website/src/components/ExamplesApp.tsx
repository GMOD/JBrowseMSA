import { useState } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

import { examples } from '../../../examples/src/examples'

export default function ExamplesApp() {
  const [selected, setSelected] = useState(0)
  const example = examples[selected]!
  const { Component } = example
  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <Box
        component="nav"
        sx={{
          width: 240,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Live examples
          </Typography>
        </Box>
        <Divider />
        <List dense>
          {examples.map((e, i) => (
            <ListItemButton
              key={e.name}
              selected={i === selected}
              onClick={() => {
                setSelected(i)
              }}
            >
              <ListItemText primary={e.name} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {example.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {example.description}
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
          <Component />
        </Paper>

        <Typography variant="subtitle2" gutterBottom>
          Source
        </Typography>
        <Paper
          variant="outlined"
          sx={{ p: 2, overflowX: 'auto', backgroundColor: 'action.hover' }}
        >
          <Box
            component="pre"
            sx={{
              m: 0,
              fontSize: 13,
              fontFamily: 'monospace',
              whiteSpace: 'pre',
            }}
          >
            {example.source}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
