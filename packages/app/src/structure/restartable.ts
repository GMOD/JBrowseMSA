import { useEffect, useRef } from 'react'

export function messageOf(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

/**
 * One abortable run at a time: `restart` aborts the run before it and hands
 * out a fresh signal, and unmounting aborts whatever is running.
 */
export function useRestartable() {
  const current = useRef<AbortController | undefined>(undefined)
  useEffect(
    () => () => {
      current.current?.abort()
    },
    [],
  )
  return {
    restart() {
      current.current?.abort()
      const controller = new AbortController()
      current.current = controller
      return controller.signal
    },
    abort() {
      current.current?.abort()
    },
  }
}
