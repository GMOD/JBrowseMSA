// @vitest-environment jsdom
import { beforeAll, expect, test } from 'vitest'

import MSAModelF from '../../model.ts'
import { drawTreeOverview, treeOverviewImage } from './renderTreeOverview.ts'

import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

const theme = {
  palette: { text: { primary: '#000000', secondary: '#888888' } },
} as Theme

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      font: '12px sans-serif',
      measureText: (t: string) => ({ width: t.length * 7 }),
      scale: () => {},
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      strokeRect: () => {},
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

// counts the calls the cull is about: one moveTo per branch that gets drawn
function countingCtx() {
  const calls = { moveTo: 0, fillRect: 0 }
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    beginPath: () => {},
    stroke: () => {},
    lineTo: () => {},
    strokeRect: () => {},
    moveTo: () => {
      calls.moveTo++
    },
    fillRect: () => {
      calls.fillRect++
    },
  } as unknown as RenderCtx
  return { ctx, calls }
}

function makeModel(tree: string) {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: { tree },
    showTreeOverview: true,
  })
  model.setWidth(800)
  return model
}

const imageArgs = { theme, width: 400, height: 120, scale: 2 }

test('the offscreen tree is drawn once and kept', () => {
  const model = makeModel('((A,B),(C,D));')
  const first = treeOverviewImage({ model, ...imageArgs })
  expect(first).toBeDefined()
  expect(treeOverviewImage({ model, ...imageArgs })).toBe(first)
})

test('collapsing a clade rebuilds it', () => {
  const model = makeModel('((A,B),(C,D));')
  const first = treeOverviewImage({ model, ...imageArgs })
  model.toggleCollapsed(model.treeOverviewHit(10)!.id)

  const second = treeOverviewImage({ model, ...imageArgs })
  expect(second).toBeDefined()
  expect(second).not.toBe(first)
  expect(treeOverviewImage({ model, ...imageArgs })).toBe(second)
})

test('a resize rebuilds it', () => {
  const model = makeModel('((A,B),(C,D));')
  const first = treeOverviewImage({ model, ...imageArgs })
  expect(treeOverviewImage({ model, ...imageArgs, height: 60 })).not.toBe(first)
})

// A balanced tree where each level's branches are half the length of the one
// above it, so the deep ones land inside the pixel their parent already covers.
// The 230k-tip COVID tree in the import form has the same shape.
function packedTree(depth: number) {
  let nodes = Array.from({ length: 2 ** depth }, (_, i) => `s${i}`)
  let length = 1
  while (nodes.length > 1) {
    const next: string[] = []
    for (let i = 0; i < nodes.length; i += 2) {
      next.push(`(${nodes[i]}:${length},${nodes[i + 1]}:${length})`)
    }
    nodes = next
    length *= 2
  }
  return `${nodes[0]!};`
}

test('a branch inside the pixel its parent covers is not drawn', () => {
  const model = makeModel(packedTree(18))
  expect(model.treeOverviewLayout!.numTips).toBe(262_144)

  const { ctx, calls } = countingCtx()
  drawTreeOverview({ model, ctx, theme, width: 400, height: 120 })

  // 524286 branches, of which about 510 move a pixel in the 400x120 band: the
  // levels below that all land on the pixel their parent covers
  expect(calls.moveTo).toBeGreaterThan(100)
  expect(calls.moveTo).toBeLessThan(5000)
})

test('a clade highlight draws behind the tree', () => {
  const model = makeModel('((A,B),(C,D));')
  model.setClades([{ mrca: ['C', 'D'], tips: 2, mark: 'highlight' }])

  const { ctx, calls } = countingCtx()
  drawTreeOverview({ model, ctx, theme, width: 400, height: 120 })
  expect(calls.fillRect).toBe(1)
})
