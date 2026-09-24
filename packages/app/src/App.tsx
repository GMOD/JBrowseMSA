import { useEffect } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import useMeasure from '@jbrowse/core/util/useMeasure'
import { isAlive } from '@jbrowse/mobx-state-tree'
import { ThemeProvider } from '@mui/material/styles'
import { observer } from 'mobx-react'
import { MSAView } from 'react-msaview'

import TopBar from './TopBar'
import { createApp } from './model'

import type { AppModel } from './model'

const mymodel = await createApp(
  new URLSearchParams(window.location.search).get('data'),
)

// Published for the screenshot harness the way jbrowse-web publishes
// window.JBrowseSession: a callout that wants to point at alignment column 38
// resolves it here (colWidth/scrollX/rowHeight/scrollY) at capture time, rather
// than hardcoding a pixel that silently goes stale when the viewport width,
// colWidth or scroll position changes. See scripts/screenshots/annotations.mjs.
declare global {
  interface Window {
    MSAVIEW_MODEL?: typeof mymodel.msaview
  }
}
window.MSAVIEW_MODEL = mymodel.msaview

// used in ViewContainer files to get the width
function useWidthSetter(view: { setWidth: (arg: number) => void }) {
  const [ref, { width }] = useMeasure()
  useEffect(() => {
    if (width && isAlive(view)) {
      // sets after a requestAnimationFrame
      // https://stackoverflow.com/a/58701523/2129219 avoids ResizeObserver
      // loop error being shown during development
      requestAnimationFrame(() => {
        view.setWidth(width)
      })
    }
  }, [view, width])
  return ref
}

const App = observer(function ({ model }: { model: AppModel }) {
  const { msaview } = model
  const ref = useWidthSetter(msaview)
  return (
    <div>
      <TopBar model={model} />
      <div
        ref={ref}
        data-testid="msaview"
        style={{ border: '1px solid black', margin: 20 }}
      >
        <MSAView model={msaview} />
      </div>
      <div style={{ height: 500 }} />
    </div>
  )
})

const MainApp = () => {
  const theme = createJBrowseTheme()
  return (
    <ThemeProvider theme={theme}>
      <App model={mymodel} />
    </ThemeProvider>
  )
}

export default MainApp
