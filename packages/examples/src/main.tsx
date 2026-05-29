import { StrictMode } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { createRoot } from 'react-dom/client'

import App from './App'

const theme = createJBrowseTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
