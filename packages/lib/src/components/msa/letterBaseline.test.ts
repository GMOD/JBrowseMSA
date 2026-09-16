// The alignment letters and the tree's tip labels share a baseline, fontSize/4
// below the row center. The font caps at 18px while a row can be 80px, so a
// baseline derived from the row height sank the letters into the bottom of a
// tall cell.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { expect, test } from 'vitest'

import stateModelFactory from '../../model.ts'
import { renderMSABlock } from './renderMSABlock.ts'

import type { RenderCtx } from '../renderCtx.ts'

const msa = '>a\nACDE\n>b\nACDE'

function letterYs(rowHeight: number) {
  const model = stateModelFactory().create({ type: 'MsaView', data: { msa } })
  model.setWidth(800)
  model.setRowHeight(rowHeight)
  model.setColWidth(rowHeight)
  const ys = new Set<number>()
  const ctx = {
    font: '',
    fillStyle: '',
    textAlign: 'center',
    textBaseline: 'alphabetic',
    resetTransform() {},
    scale() {},
    translate() {},
    fillRect() {},
    fillText(_text: string, _x: number, y: number) {
      ys.add(y)
    },
  } as unknown as RenderCtx
  renderMSABlock({
    model,
    ctx,
    theme: createJBrowseTheme(),
    offsetX: 0,
    offsetY: 0,
  })
  return { model, ys: [...ys] }
}

test('a letter sits fontSize/4 below its row center, like a tip label', () => {
  const { model, ys } = letterYs(80)
  expect(model.fontSize).toBe(18)
  // the context is translated by rowHeight/2, so a leaf's x is its row bottom
  expect(ys).toEqual(model.leaves.map(l => l.x! - 40 + 18 / 4))
})
