import { addDisposer, getSnapshot, types } from '@jbrowse/mobx-state-tree'
import { autorun } from 'mobx'
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
            // A document too large for the snapshot leaves it (see
            // `unshareableData`), so writing the snapshot here would replace a
            // working URL with one that opens an empty viewer. Drop the param
            // instead: the address bar then says what the header says, which is
            // that this view is not in the link.
            if (self.msaview.unshareableData.length > 0) {
              url.searchParams.delete('data')
            } else {
              url.searchParams.set('data', JSON.stringify(getSnapshot(self)))
            }
            window.history.replaceState(null, '', url.toString())
          },
          { delay: 1000 },
        ),
      )
    },
  }))

export default App
export type AppModel = Instance<typeof App>
