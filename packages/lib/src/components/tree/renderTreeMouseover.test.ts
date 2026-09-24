import { expect, test } from 'vitest'

import stateModelFactory from '../../model.ts'
import { renderTreeMouseover } from './renderTreeMouseover.ts'

test('the hover band scales to the device pixel ratio', () => {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa: '>a\nAC\n>b\nAC\n>c\nAC', tree: '(a,(b,c));' },
  })
  model.setWidth(800)
  model.setHighResScaleFactor(2)
  model.setMousePos(0, 1)

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

  renderTreeMouseover({ ctx, model })

  const { treeAreaWidth, height, rowHeight, scrollY } = model
  expect(calls).toEqual([
    `clearRect 0,0,${treeAreaWidth * 2},${height * 2}`,
    'scale 2,2',
    `fillRect 0,${rowHeight + scrollY},${treeAreaWidth},${rowHeight}`,
  ])
})
