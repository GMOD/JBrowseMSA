import { types } from '@jbrowse/mobx-state-tree'

import type { DialogComponentType } from '@jbrowse/core/util'

/**
 * #stateModel DialogQueueSessionMixin
 */
export function DialogQueueSessionMixin() {
  return types
    .model('DialogQueueSessionMixin', {})
    .volatile(() => ({
      queueOfDialogs: [] as [DialogComponentType, unknown][],
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
        const props = self.queueOfDialogs[0]?.[1]
        return typeof props === 'object' && props !== null ? props : undefined
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
      queueDialog(
        cb: (doneCallback: () => void) => [DialogComponentType, unknown],
      ) {
        const [component, props] = cb(() => {
          this.removeActiveDialog()
        })
        self.queueOfDialogs = [...self.queueOfDialogs, [component, props]]
      },
    }))
}
