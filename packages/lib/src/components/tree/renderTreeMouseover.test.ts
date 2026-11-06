import { expect, test } from 'vitest'

import stateModelFactory from '../../model.ts'
import { renderTreeMouseover } from './renderTreeMouseover.ts'

function recordingCtx() {
  const calls: string[] = []
  const ctx = {
    fillStyle: '',
    resetTransform() {},
    clearRect(...args: number[]) {
      calls.push(`clearRect ${args.join(',')}`)
    },
    scale(x: number, y: number) {
      calls.push(`scale ${x},${y}`)
    },
    fillRect(...args: number[]) {
      calls.push(`fillRect ${args.join(',')}`)
    },
  } as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

test('the hover band scales to the device pixel ratio', () => {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa: '>a\nAC\n>b\nAC\n>c\nAC', tree: '(a,(b,c));' },
  })
  model.setWidth(800)
  model.setHighResScaleFactor(2)
  model.setMousePos(0, 1)

  const { ctx, calls } = recordingCtx()
  renderTreeMouseover({ ctx, model })

  const { effectiveTreeAreaWidth, msaAreaHeight, rowHeight, scrollY } = model
  expect(calls).toEqual([
    `clearRect 0,0,${effectiveTreeAreaWidth * 2},${msaAreaHeight * 2}`,
    'scale 2,2',
    `fillRect 0,${rowHeight + scrollY},${effectiveTreeAreaWidth},${rowHeight}`,
  ])
})

test('a hovered node lights its tips as one band cut to the visible rows', () => {
  const tips = Array.from({ length: 5000 }, (_, i) => `t${i}`)
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { tree: `((${tips.join(',')}),x);` },
  })
  model.setWidth(800)
  const clade = model.root.children![0]!
  model.setHoveredTreeNode(clade.data.id)
  expect(model.hoveredRowIndices).toHaveLength(5000)

  const { ctx, calls } = recordingCtx()
  renderTreeMouseover({ ctx, model })

  const { effectiveTreeAreaWidth, msaAreaHeight } = model
  expect(calls.filter(c => c.startsWith('fillRect'))).toEqual([
    `fillRect 0,0,${effectiveTreeAreaWidth},${msaAreaHeight}`,
  ])
})
