// The alignment marks drawn into a block: each mark in list order between the
// residue cells and the letters, a bar's halo only over residue colors, and a
// letter under a row-tall span contrasting against that span.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { expect, test } from 'vitest'

import stateModelFactory from '../../model.ts'
import { contrastTextFn } from '../../util.ts'
import { renderBoxFeatureCanvasBlock } from './renderBoxFeatureCanvasBlock.ts'
import { renderMSABlock } from './renderMSABlock.ts'

import type { AlignmentMarkSpec, Feature } from '../../types.ts'
import type { RenderCtx } from '../renderCtx.ts'

const row = 'ACDEFGHIKLMNPQRSTVWY'
const msa = `>a\n${row}\n>b\n${row}`

const features: Feature[] = [
  { row: 'a', start: 1, end: 10, name: 'geneA', type: 'gene' },
  { row: 'a', start: 3, end: 4, type: 'modified_base', color: '#000000' },
]

const calls: AlignmentMarkSpec = {
  kind: 'features',
  filter: [{ field: 'type', oneOf: ['modified_base'] }],
  height: { band: 1 },
}

const genes: AlignmentMarkSpec = {
  kind: 'features',
  filter: [{ field: 'type', oneOf: ['gene'] }],
  height: 3,
}

function makeModel(marks: AlignmentMarkSpec[]) {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa },
    features,
    marks,
  })
  model.setWidth(1000)
  return model
}

interface Op {
  op: 'rect' | 'text'
  x: number
  y: number
  w: number
  h: number
  fill: string
  text?: string
}

function recordingCtx() {
  const ops: Op[] = []
  let fillStyle = '#000'
  const ctx = {
    font: '12px sans-serif',
    strokeStyle: '#000',
    textAlign: 'center',
    textBaseline: 'alphabetic',
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(arg: string) {
      fillStyle = arg
    },
    resetTransform() {},
    scale() {},
    translate() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    measureText: (text: string) => ({ width: text.length * 6 }),
    fillRect(x: number, y: number, w: number, h: number) {
      ops.push({ op: 'rect', x, y, w, h, fill: fillStyle })
    },
    strokeRect() {},
    fillText(text: string, x: number, y: number) {
      ops.push({ op: 'text', x, y, w: 0, h: 0, fill: fillStyle, text })
    },
  } as unknown as RenderCtx
  return { ctx, ops }
}

function drawBlock(model: ReturnType<typeof makeModel>) {
  const { ctx, ops } = recordingCtx()
  renderMSABlock({
    model,
    ctx,
    theme: createJBrowseTheme(),
    offsetX: 0,
    offsetY: 0,
    domains: true,
  })
  return ops
}

test('a row-tall mark draws over the residue colors and under the letters', () => {
  const model = makeModel([calls])
  model.setCellFill('residue')
  expect(model.cellFill).toBe('residue')
  const ops = drawBlock(model)
  const { colWidth, rowHeight } = model
  const span = ops.findIndex(o => o.op === 'rect' && o.fill === '#000000')
  expect(ops[span]).toMatchObject({
    x: 2 * colWidth,
    w: 2 * colWidth,
    h: rowHeight,
  })
  const cells = ops.filter(o => o.op === 'rect' && o.h === rowHeight)
  expect(ops.indexOf(cells[0]!)).toBeLessThan(span)
  expect(ops.findIndex(o => o.op === 'text')).toBeGreaterThan(span)
})

test('a letter under a row-tall span contrasts against it under the residue fill', () => {
  const model = makeModel([calls])
  model.setCellFill('residue')
  const letters = drawBlock(model).filter(o => o.op === 'text')
  const ink = contrastTextFn(createJBrowseTheme())('#000000')
  expect(letters.slice(2, 4).map(l => l.fill)).toEqual([ink, ink])
  expect(letters[0]!.fill).not.toBe(ink)
})

test('the topmost row-tall span sets the ink where two marks cover a letter', () => {
  const model = makeModel([
    {
      kind: 'features',
      height: { band: 1 },
      encoding: { fill: { value: '#ffffff' } },
    },
    calls,
  ])
  model.setCellFill('none')
  const ink = contrastTextFn(createJBrowseTheme())
  const letters = drawBlock(model).filter(o => o.op === 'text')
  expect(letters[0]!.fill).toBe(ink('#ffffff'))
  expect(letters[2]!.fill).toBe(ink('#000000'))
})

test('marks draw in list order, and a bar over residue colors keeps its halo', () => {
  const model = makeModel([genes, calls])
  model.setCellFill('residue')
  const { ctx, ops } = recordingCtx()
  renderBoxFeatureCanvasBlock({
    model,
    ctx,
    theme: createJBrowseTheme(),
    offsetX: 0,
    offsetY: 0,
  })
  const { rowHeight } = model
  const halo = createJBrowseTheme().palette.background.default
  expect(ops.map(o => [o.fill === halo ? 'halo' : o.fill, o.h])).toEqual([
    ['halo', 4.5],
    [expect.any(String), 3],
    ['#000000', rowHeight],
  ])
  // the bar sits on the row's foot
  expect(ops[1]!.y + ops[1]!.h).toBe(ops[2]!.y + ops[2]!.h)
})

test('an empty list draws no span and leaves the letters to the cells', () => {
  const model = makeModel([])
  const { ctx, ops } = recordingCtx()
  renderBoxFeatureCanvasBlock({
    model,
    ctx,
    theme: createJBrowseTheme(),
    offsetX: 0,
    offsetY: 0,
  })
  expect(ops).toEqual([])
  expect(model.cellFill).toBe('residue')
})
