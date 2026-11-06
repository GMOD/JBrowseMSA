import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { expect, test } from 'vitest'

import stateModelFactory from '../../model.ts'
import { renderHighlights } from './renderHighlights.ts'

import type { RenderCtx } from '../renderCtx.ts'

const theme = createJBrowseTheme()
const rowCount = 40
const msa = Array.from(
  { length: rowCount },
  (_, i) => `>seq${i}\nACDEFGHIKL`,
).join('\n')

interface Rect {
  x: number
  y: number
  width: number
  height: number
  fill: string
}

function drawBlock(
  model: ReturnType<ReturnType<typeof stateModelFactory>['create']>,
  {
    offsetX = 0,
    offsetY,
    height,
  }: { offsetX?: number; offsetY: number; height: number },
  texts: string[] = [],
) {
  const rects: Rect[] = []
  let fillStyle = ''
  const ctx = {
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(color: string) {
      fillStyle = color
    },
    lineWidth: 0,
    strokeStyle: '',
    textAlign: 'start',
    font: '12px sans-serif',
    setLineDash() {},
    measureText: (text: string) => ({ width: text.length * 6 }),
    fillText(text: string) {
      texts.push(text)
    },
    strokeRect() {},
    fillRect(x: number, y: number, width: number, height: number) {
      rects.push({ x, y, width, height, fill: fillStyle })
    },
  } as unknown as RenderCtx

  renderHighlights({
    ctx,
    model,
    theme,
    offsetX,
    offsetY,
    width: 500,
    height,
  })
  return rects
}

function modelWith(snapshot: Record<string, unknown>) {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa },
    ...snapshot,
  })
  model.setWidth(800)
  model.setRowHeight(20)
  return model
}

test('a row highlight draws only in the blocks holding that row', () => {
  const model = modelWith({
    highlights: [{ rows: ['seq30'], color: 'rgb(7, 7, 7)' }],
  })
  const { rowHeight } = model
  expect(model.resolvedHighlights[0]!.rowIndices).toEqual([30])

  const first = drawBlock(model, { offsetY: 0, height: 200 })
  const holding = drawBlock(model, { offsetY: 600, height: 200 })

  expect(first).toEqual([])
  expect(holding).toEqual([
    {
      x: 0,
      y: 30 * rowHeight - 600,
      width: 500,
      height: rowHeight,
      fill: 'rgb(7, 7, 7)',
    },
  ])
})

test('a row tint washes each row of the block and no others', () => {
  const model = modelWith({
    encodings: [{ channel: 'rowTint', field: 'clade' }],
  })
  model.setRowData(
    Object.fromEntries(
      Array.from({ length: rowCount }, (_, i) => [
        `seq${i}`,
        { clade: i < 20 ? 'early' : 'late' },
      ]),
    ),
  )

  const drawn = drawBlock(model, { offsetY: 0, height: 200 })
  // 200px of 20px rows
  expect(drawn).toHaveLength(10)
  expect(new Set(drawn.map(r => r.fill))).toEqual(new Set([model.rowTints![0]]))
  expect(drawn.map(r => r.y)).toEqual(
    Array.from({ length: 10 }, (_, i) => i * 20),
  )

  const across = drawBlock(model, { offsetY: 300, height: 200 })
  expect(new Set(across.map(r => r.fill)).size).toBe(2)
})

test('a tint stops at the last row', () => {
  const model = modelWith({
    encodings: [{ channel: 'rowTint', field: 'clade' }],
  })
  model.setRowData({ seq39: { clade: 'last' } })

  const drawn = drawBlock(model, { offsetY: 600, height: 400 })
  expect(drawn.map(r => r.y)).toEqual([39 * 20 - 600])
})

test('a column band scrolled out of the block draws neither band nor label', () => {
  const model = modelWith({
    highlights: [{ row: 'seq0', start: 2, end: 2, label: 'R175' }],
  })
  const onScreenTexts: string[] = []
  drawBlock(model, { offsetY: 0, height: 200 }, onScreenTexts)
  const scrolledTexts: string[] = []
  const scrolled = drawBlock(
    model,
    { offsetX: 5 * model.colWidth, offsetY: 0, height: 200 },
    scrolledTexts,
  )
  expect(onScreenTexts).toEqual(['R175'])
  expect(scrolled).toEqual([])
  expect(scrolledTexts).toEqual([])
})
