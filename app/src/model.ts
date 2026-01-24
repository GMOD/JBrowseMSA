import { autorun } from 'mobx'
import { addDisposer, getSnapshot, types } from '@jbrowse/mobx-state-tree'
import { MSAModelF } from 'react-msaview'

import type { Instance } from '@jbrowse/mobx-state-tree'

const App = types
  .model({
    msaview: MSAModelF(),
  })
  .actions(self => ({
    afterCreate() {
      addDisposer(
        self,
        autorun(
          () => {
            const url = new URL(window.document.URL)
            url.searchParams.set('data', JSON.stringify(getSnapshot(self)))
            window.history.replaceState(null, '', url.toString())
          },
          { delay: 1000 },
        ),
      )
    },
  }))

export default App
export type AppModel = Instance<typeof App>
