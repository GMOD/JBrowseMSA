import { useState } from 'react'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

import { examples } from './examples'

export default function App() {
  const [selected, setSelected] = useState(0)
  const example = examples[selected]!
  const { Component } = example
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Box
        component="nav"
        sx={{
          width: 260,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">react-msaview</Typography>
          <Typography variant="caption" color="text.secondary">
            usage examples
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
              <ListItemText primary={e.name} secondary={e.description} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Link
            href="https://github.com/GMOD/react-msaview"
            target="_blank"
            rel="noopener"
            variant="body2"
          >
            GitHub
          </Link>
        </Box>
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
          sx={{
            p: 2,
            overflowX: 'auto',
            backgroundColor: 'action.hover',
          }}
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
