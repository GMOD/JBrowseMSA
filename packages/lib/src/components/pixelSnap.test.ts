// @vitest-environment jsdom
import { Context } from '@jbrowse/svgcanvas'
import { expect, test } from 'vitest'

import { installSvgTestEnv } from '../svgTestUtil.ts'
import { cellFillRect } from './pixelSnap.ts'

function canvasCtx(k: number, shiftY: number) {
  const rects: { x: number; y: number; w: number; h: number }[] = []
  const ctx = {
    canvas: {},
    getTransform: () => ({ a: k, d: k, e: 0, f: shiftY }),
    fillRect: (x: number, y: number, w: number, h: number) => {
      rects.push({ x, y, w, h })
    },
  }
  return { ctx, rects }
}

test('stacked cells meet on whole device pixels at a fractional pixel ratio', () => {
  const k = 1.25
  const rowHeight = 14
  const shiftY = (k * rowHeight) / 2
  const { ctx, rects } = canvasCtx(k, shiftY)
  const fillCell = cellFillRect(ctx)
  for (let row = 0; row < 6; row++) {
    fillCell(15, row * rowHeight - rowHeight / 2, 15, rowHeight)
  }
  const device = rects.map(({ x, y, w, h }) => ({
    left: x * k,
    right: (x + w) * k,
    top: y * k + shiftY,
    bottom: (y + h) * k + shiftY,
  }))
  for (const r of device) {
    for (const edge of Object.values(r)) {
      expect(edge).toBeCloseTo(Math.round(edge), 9)
    }
  }
  for (let i = 1; i < device.length; i++) {
    expect(device[i]!.top).toBeCloseTo(device[i - 1]!.bottom, 9)
  }
})

test('neighbors share an edge when float error straddles half a device pixel', () => {
  const k = 1.1
  const colWidth = 1.4
  const { ctx, rects } = canvasCtx(k, 0)
  const fillCell = cellFillRect(ctx)
  for (let col = 0; col < 500; col++) {
    fillCell(col * colWidth, 0, colWidth, 14)
  }
  for (let i = 1; i < rects.length; i++) {
    const prev = rects[i - 1]!
    expect(rects[i]!.x * k).toBeCloseTo((prev.x + prev.w) * k, 9)
  }
})

test('a cell under one device pixel keeps its exact edges on that axis', () => {
  const { ctx, rects } = canvasCtx(1.25, 0)
  cellFillRect(ctx)(1.3, 2.3, 0.5, 14)
  expect(rects[0]!.x).toBe(1.3)
  expect(rects[0]!.w).toBe(0.5)
  expect(rects[0]!.y * 1.25).toBeCloseTo(3, 9)
})

test('an SVG export draws the exact geometry', () => {
  installSvgTestEnv()
  const ctx = new Context(100, 100)
  ctx.scale(1.25, 1.25)
  cellFillRect(ctx)(1.3, 2.6, 15.1, 14.2)
  expect(ctx.getSvg().innerHTML).toContain(
    'x="1.3" y="2.6" width="15.1" height="14.2"',
  )
})
