import { createJBrowseTheme } from '@jbrowse/core/ui/theme'

// the stock JBrowse theme — primary is midnight navy (#0D233F). Shared by the
// website's React islands so their MUI controls match the embedded MSAViewer
// (which builds the same theme internally) instead of falling back to MUI blue.
export const theme = createJBrowseTheme()
