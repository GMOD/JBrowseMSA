import { useEffect, useRef } from 'react'

import { autorun } from 'mobx'

import type React from 'react'

/**
 * Wires a canvas ref to a mobx autorun: grabs the 2d context once the canvas
 * mounts and re-runs `draw` whenever any observable it reads changes.
 *
 * `width`/`height` are the canvas backing store size (logical size times the
 * high-res scale factor). Assigning either clears the bitmap, and React assigns
 * them after the mobx reaction has drawn at the old size, so the effect redraws
 * when they change.
 *
 * `deps` covers everything else the effect should re-subscribe on, matching a
 * normal useEffect dep array.
 */
export function useCanvasAutorun({
  draw,
  width,
  height,
  deps,
}: {
  draw: (ctx: CanvasRenderingContext2D) => void
  width: number
  height: number
  deps: React.DependencyList
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  // the autorun tracks its own observable reads, so `draw` is intentionally not
  // a dependency; `deps` plus the canvas size control when it re-subscribes
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    return ctx
      ? autorun(() => {
          draw(ctx)
        })
      : undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, width, height])
  return ref
}
