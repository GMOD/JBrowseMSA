import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ThemeProvider } from '@mui/material/styles'

import ExampleBrowser from '../../../packages/examples/src/ExampleBrowser'
import { theme } from '../lib/theme'

export default function ExamplesApp() {
  return (
    <ThemeProvider theme={theme}>
      <ExampleBrowser
        height="100%"
        sidebarHeader={
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Live examples
            </Typography>
          </Box>
        }
      />
    </ThemeProvider>
  )
}
