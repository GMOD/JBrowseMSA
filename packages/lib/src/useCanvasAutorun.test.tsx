// @vitest-environment jsdom
//
// Assigning width/height to a canvas resets its bitmap, and React assigns them
// on every commit where they changed. A draw that ran during the mobx reaction
// -- before React commits -- is therefore wiped by the resize that follows it,
// which is what used to blank the tree on a tree-area drag and the consensus
// tracks on a vertical zoom. So the hook has to draw again after the resize.
import React, { act } from 'react'

import { observable, runInAction } from 'mobx'
import { observer } from 'mobx-react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, expect, test } from 'vitest'

import { useCanvasAutorun } from './useCanvasAutorun.ts'

import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return { canvas: this } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

const state = observable({ width: 100, color: 'red' })
// what each draw saw: the observables it renders from, and the size of the
// canvas it was drawing onto
let draws: { observed: number; color: string; canvas: number }[] = []

const Probe = observer(function () {
  const ref = useCanvasAutorun({
    draw: ctx => {
      draws.push({
        observed: state.width,
        color: state.color,
        canvas: ctx.canvas.width,
      })
    },
    width: state.width,
    height: 50,
    deps: [],
  })
  return <canvas ref={ref} width={state.width} height={50} />
})

let container: HTMLElement
let root: Root

beforeEach(() => {
  draws = []
  runInAction(() => {
    state.width = 100
    state.color = 'red'
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<Probe />)
  })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

test('the first draw sees the canvas at its rendered size', () => {
  expect(draws).toEqual([{ observed: 100, color: 'red', canvas: 100 }])
})

test('a resize is followed by a draw onto the resized canvas', () => {
  act(() => {
    runInAction(() => {
      state.width = 300
    })
  })

  expect(container.querySelector('canvas')!.width).toBe(300)
  expect(draws.at(-1)).toEqual({ observed: 300, color: 'red', canvas: 300 })
})

test('a change that leaves the size alone draws exactly once', () => {
  act(() => {
    runInAction(() => {
      state.color = 'blue'
    })
  })

  expect(draws).toEqual([
    { observed: 100, color: 'red', canvas: 100 },
    { observed: 100, color: 'blue', canvas: 100 },
  ])
})
