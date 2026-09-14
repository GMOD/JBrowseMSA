import { expect, test } from 'vitest'

import MSAModelF from '../../model.ts'
import { scaleBarLength } from './scaleBar.ts'

test('a round step at about half the space it is given', () => {
  expect(scaleBarLength(1000, 200)).toMatchObject({ step: 0.1, px: 100 })
  expect(scaleBarLength(100, 200)).toMatchObject({ step: 1, px: 100 })
  expect(scaleBarLength(250, 200)).toMatchObject({ step: 0.2, px: 50 })
  expect(scaleBarLength(1000, 200)!.label).toBe('0.1')
})

test('nothing to draw without lengths or without room', () => {
  expect(scaleBarLength(0, 200)).toBeUndefined()
  expect(scaleBarLength(1000, 10)).toBeUndefined()
})

test('the model reports pixels per unit of branch length', () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    data: { tree: '((a:0.1,b:0.2):0.05,c:0.3);' },
  })
  model.setWidth(1000)

  // the deepest root-to-tip path is 0.05 + 0.2, and it spans the tree area
  expect(model.pxPerBranchLength).toBeCloseTo(model.treeWidth / 0.3)

  model.setShowBranchLen(false)
  expect(model.pxPerBranchLength).toBe(0)
})
