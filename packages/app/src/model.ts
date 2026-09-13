import { addDisposer, getSnapshot, types } from '@jbrowse/mobx-state-tree'
import { autorun } from 'mobx'
import { MSAModelF } from 'react-msaview'

import type { Instance, SnapshotIn } from '@jbrowse/mobx-state-tree'

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
            // A link that failed to open stays in the address bar, so the
            // reader can see and fix what they pasted
            if (self.msaview.error) {
              return
            }
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

const empty = { msaview: { type: 'MsaView' as const } }

function toSnapshot(param: string): SnapshotIn<typeof App> {
  const parsed: unknown = JSON.parse(param)
  if (parsed && typeof parsed === 'object') {
    if ('msaview' in parsed) {
      return parsed as SnapshotIn<typeof App>
    }
    if ('type' in parsed && parsed.type === 'MsaView') {
      return { msaview: parsed } as SnapshotIn<typeof App>
    }
  }
  throw new Error(
    'expected {"msaview": {"type": "MsaView", ...}} or a bare {"type": "MsaView", ...} snapshot',
  )
}

// `?data=` takes the app snapshot, `{"msaview": {...}}`, or the MsaView
// snapshot on its own, which is what docs/layers.md and every other embedding
// write. A value that is neither opens on an error rather than on the empty
// import form, which would read as the link having no data in it.
export function createApp(param: string | null) {
  if (!param) {
    return App.create(empty)
  }
  try {
    return App.create(toSnapshot(param))
  } catch (e) {
    const app = App.create(empty)
    app.msaview.setError(
      new Error(
        `Could not open the view in this link's ?data= parameter: ${e instanceof Error ? e.message : String(e)}`,
      ),
    )
    return app
  }
}

export default App
export type AppModel = Instance<typeof App>
