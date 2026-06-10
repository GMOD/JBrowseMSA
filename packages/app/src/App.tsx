import { useEffect } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import useMeasure from '@jbrowse/core/util/useMeasure'
import { isAlive } from '@jbrowse/mobx-state-tree'
import { ThemeProvider } from '@mui/material/styles'
import { observer } from 'mobx-react'
import { MSAView } from 'react-msaview'

// locals
import AppGlobal from './model'

import type { AppModel } from './model'

const urlParams = new URLSearchParams(window.location.search)
const val = urlParams.get('data')

function parseData(data: string | null) {
  let result = { msaview: { type: 'MsaView' } }
  if (data) {
    try {
      result = JSON.parse(data)
    } catch (e) {
      console.error('Failed to parse ?data= URL param', e)
    }
  }
  return result
}

const mymodel = AppGlobal.create(parseData(val))

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
