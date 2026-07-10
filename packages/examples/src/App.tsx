import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import ExampleBrowser from './ExampleBrowser'

export default function App() {
  return (
    <ExampleBrowser
      height="100vh"
      sidebarHeader={
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">react-msaview</Typography>
          <Typography variant="caption" color="text.secondary">
            usage examples
          </Typography>
        </Box>
      }
      sidebarFooter={
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
      }
    />
  )
}
