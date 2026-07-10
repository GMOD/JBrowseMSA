import { useEffect, useRef } from 'react'
import type React from 'react'

import { autorun } from 'mobx'

// Wires a canvas ref to a mobx autorun: grabs the 2d context once the canvas
// mounts and re-runs `draw` whenever any observable it reads changes. Collapses
// the getContext/null-guard/autorun-dispose boilerplate repeated by every
// canvas block host. `deps` controls when the effect (and thus the context
// lookup) is torn down and re-created, matching a normal useEffect dep array.
export function useCanvasAutorun(
  draw: (ctx: CanvasRenderingContext2D) => void,
  deps: React.DependencyList,
) {
  const ref = useRef<HTMLCanvasElement>(null)
  // the autorun tracks its own observable reads, so `draw` is intentionally not
  // a dependency; `deps` alone controls when the effect re-subscribes
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    return ctx
      ? autorun(() => {
          draw(ctx)
        })
      : undefined
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, deps)
  return ref
}
