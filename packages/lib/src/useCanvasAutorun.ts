import { useEffect, useRef } from 'react'

import { autorun } from 'mobx'

import type React from 'react'

/**
 * Wires a canvas ref to a mobx autorun: grabs the 2d context once the canvas
 * mounts and re-runs `draw` whenever any observable it reads changes. Collapses
 * the getContext/null-guard/autorun-dispose boilerplate repeated by every canvas
 * block host.
 *
 * `width`/`height` are the canvas *backing store* size the caller renders onto
 * the element (logical size times the high-res scale factor), and they are load
 * bearing rather than informational. Assigning either resets the canvas bitmap,
 * and React assigns them on every commit where they changed -- which lands
 * *after* the mobx reaction that already redrew at the old size. Without a redraw
 * on the far side of that commit the canvas is left blank: it is what blanked the
 * tree on a tree-area resize and the consensus tracks on a vertical zoom.
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
