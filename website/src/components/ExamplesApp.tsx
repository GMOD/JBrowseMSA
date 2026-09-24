import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { ThemeProvider } from '@mui/material/styles'

import ExampleBrowser from '../../../packages/examples/src/ExampleBrowser'
import { app, docs, tutorials } from '../lib/links'
import { theme } from '../lib/theme'

const guide = docs.find(d => d.label === 'User guide')!

export default function ExamplesApp() {
  return (
    <ThemeProvider theme={theme}>
      <ExampleBrowser
        height="100%"
        sidebarHeader={
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Usage patterns
            </Typography>
          </Box>
        }
        sidebarFooter={
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Your own data
            </Typography>
            <Typography variant="body2" component="div">
              <Link href={app.href} sx={{ display: 'block' }}>
                Open a file in the standalone app
              </Link>
              <Link href={tutorials.href} sx={{ display: 'block' }}>
                Prepare an alignment, tree and annotations
              </Link>
              <Link href={guide.href} sx={{ display: 'block' }}>
                User guide
              </Link>
            </Typography>
          </Box>
        }
      />
    </ThemeProvider>
  )
}
