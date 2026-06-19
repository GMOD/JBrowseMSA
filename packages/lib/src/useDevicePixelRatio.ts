import { useSyncExternalStore } from 'react'

// Subscribes to devicePixelRatio changes (moving the window between monitors,
// browser zoom). The matchMedia query is pinned to the current ratio, so on each
// change we re-register against the new ratio to keep tracking subsequent moves.
function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }
  let mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
  function onChange() {
    callback()
    mql.removeEventListener('change', onChange)
    mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    mql.addEventListener('change', onChange)
  }
  mql.addEventListener('change', onChange)
  return () => {
    mql.removeEventListener('change', onChange)
  }
}

function getSnapshot() {
  return typeof window === 'undefined' ? 1 : window.devicePixelRatio
}

export function useDevicePixelRatio() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 1)
}
