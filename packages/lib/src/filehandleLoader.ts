import { openLocation } from '@jbrowse/core/util/io'
import { addDisposer, isAlive } from '@jbrowse/mobx-state-tree'
import { autorun, transaction } from 'mobx'

import { fetchTextWithProgress, isAbortError } from './fetchUtils.ts'

import type { FetchStatus } from './fetchUtils.ts'
import type { FileLocation } from '@jbrowse/core/util/types'
import type { IStateTreeNode } from '@jbrowse/mobx-state-tree'

interface LoaderHost extends IStateTreeNode {
  setStatus: (status?: FetchStatus) => void
  setError: (error?: unknown) => void
  addWarning: (warning: string) => void
}

interface FilehandleLoader {
  /** the layer's name in a failure message */
  what: string
  getFilehandle: () => FileLocation | undefined
  onLoad: (text: string) => void
  setLoading?: (loading: boolean) => void
  /** runs after a local file loads, since a blob has no URL to refetch, and on cancel */
  clearFilehandle?: () => void
  /** a failure adds a warning instead of an error */
  optional?: boolean
}

/**
 * Latest-wins abort rotation, after `createAbortRotation` in
 * jbrowse-components. Each `begin()` aborts the previous fetch and returns a
 * signal with an `isCurrent()` guard; gate every write after an await on it so a
 * superseded or torn-down fetch cannot overwrite fresher data. `end()` in the
 * `finally` closes the guard of a fetch that completed.
 */
export function createAbortRotation(self: IStateTreeNode) {
  let current: { controller: AbortController; ended: boolean } | undefined
  return {
    /** aborts the running fetch, and returns whether one was running */
    cancel() {
      const running = current !== undefined && !current.ended
      current?.controller.abort()
      current = undefined
      return running
    },
    begin() {
      current?.controller.abort()
      const mine = { controller: new AbortController(), ended: false }
      current = mine
      return {
        controller: mine.controller,
        isCurrent: () => !mine.ended && mine === current && isAlive(self),
        end: () => {
          mine.ended = true
        },
      }
    },
  }
}

/**
 * Fetches the filehandle whenever it changes and hands the text to `onLoad`. A
 * superseded or cleared request is aborted and clears its status line.
 */
export function installFilehandleLoader(
  self: LoaderHost,
  {
    what,
    getFilehandle,
    onLoad,
    setLoading,
    clearFilehandle,
    optional = false,
  }: FilehandleLoader,
) {
  const rotation = createAbortRotation(self)
  const cancel = () => {
    if (rotation.cancel() && isAlive(self)) {
      self.setStatus(undefined)
    }
  }
  addDisposer(self, cancel)
  addDisposer(
    self,
    autorun(async () => {
      const filehandle = getFilehandle()
      cancel()
      if (!filehandle) {
        setLoading?.(false)
        return
      }
      const { controller, isCurrent, end } = rotation.begin()
      try {
        setLoading?.(true)
        if (!optional) {
          self.setError(undefined)
        }
        const text = await fetchTextWithProgress(
          openLocation(filehandle),
          status => {
            if (isCurrent()) {
              self.setStatus(status)
            }
          },
          { controller },
        )
        if (isCurrent()) {
          transaction(() => {
            onLoad(text)
            if (filehandle.locationType === 'BlobLocation') {
              clearFilehandle?.()
            }
          })
        }
      } catch (e) {
        if (isCurrent()) {
          if (isAbortError(e)) {
            clearFilehandle?.()
          } else {
            console.error(e)
            if (optional) {
              self.addWarning(`The ${what} did not load: ${String(e)}`)
            } else {
              self.setError(e)
            }
          }
        }
      } finally {
        if (isCurrent()) {
          setLoading?.(false)
        }
        end()
      }
    }),
  )
}
