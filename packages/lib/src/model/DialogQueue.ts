import { types } from '@jbrowse/mobx-state-tree'

import type { DialogComponentType } from '@jbrowse/core/util'
import type { ComponentProps } from 'react'

/**
 * #stateModel DialogQueueSessionMixin
 */
export function DialogQueueSessionMixin() {
  return types
    .model('DialogQueueSessionMixin', {})
    .volatile(() => ({
      queueOfDialogs: [] as [DialogComponentType, Record<string, unknown>][],
    }))
    .views(self => ({
      /**
       * #getter
       */
      get DialogComponent() {
        return self.queueOfDialogs[0]?.[0]
      },
      /**
       * #getter
       */
      get DialogProps() {
        return self.queueOfDialogs[0]?.[1]
      },
    }))
    .actions(self => ({
      /**
       * #action
       */
      removeActiveDialog() {
        self.queueOfDialogs = self.queueOfDialogs.slice(1)
      },
      /**
       * #action
       */
      queueDialog<T extends DialogComponentType>(
        cb: (doneCallback: () => void) => [T, ComponentProps<T>],
      ) {
        const entry: [DialogComponentType, Record<string, unknown>] = cb(() => {
          this.removeActiveDialog()
        })
        self.queueOfDialogs = [...self.queueOfDialogs, entry]
      },
    }))
}
