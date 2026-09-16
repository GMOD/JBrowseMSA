// @vitest-environment jsdom
//
// Sub-row layout used to give every annotation on a row its own 4px band and
// stack them downward without a bound, so a row carrying more annotations than
// fit drew the rest on top of the rows below it. Lanes now come from overlap,
// and a row deep enough to overflow shares out its height instead.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { expect, test } from 'vitest'

import { renderBoxFeatureCanvasBlock } from './components/msa/renderBoxFeatureCanvasBlock.ts'
import MSAModelF from './model.ts'

import type { RenderCtx } from './components/renderCtx.ts'

const row = 'ACDEFGHIKLMNPQRSTVWY'.repeat(3)
const msa = `>seq1\n${row}\n>seq2\n${row}`

const rowHeight = 16

function makeModel(gff: string) {
  const model = MSAModelF().create({ type: 'MsaView', data: { msa } })
  model.setWidth(1000)
  model.setRowHeight(rowHeight)
  model.applyGFFText(gff)
  model.setSubFeatureRows(true)
  return model
}

function feature(name: string, start: number, end: number) {
  return `seq1\tsrc\tprotein_match\t${start}\t${end}\t.\t.\t.\tName=${name}`
}

function gffOf(...features: string[]) {
  return ['##gff-version 3', ...features].join('\n')
}

function lanesOf(model: ReturnType<typeof makeModel>) {
  return model.domainBands
    .get('seq1')!
    .map(b => [b.annotation.accession, b.lane] as const)
}

// the renderer draws in a frame the caller has translated down by half a row,
// so applying the translate puts the recorded boxes in screen coordinates,
// where row i spans i*rowHeight to (i+1)*rowHeight
function drawnBoxes(model: ReturnType<typeof makeModel>) {
  let ty = 0
  const boxes: { top: number; bottom: number }[] = []
  const ctx = {
    font: '',
    resetTransform() {},
    scale() {},
    translate(_x: number, y: number) {
      ty = y
    },
    fillRect(_x: number, y: number, _w: number, h: number) {
      boxes.push({ top: y + ty, bottom: y + ty + h })
    },
    strokeRect() {},
    measureText: (t: string) => ({ width: t.length * 6 }),
    fillText() {},
  } as unknown as RenderCtx
  renderBoxFeatureCanvasBlock({
    model,
    ctx,
    theme: createJBrowseTheme(),
    offsetX: 0,
    offsetY: 0,
  })
  return boxes
}

test('annotations that never overlap share one lane', () => {
  const model = makeModel(
    gffOf(feature('E1', 1, 20), feature('E2', 21, 40), feature('E3', 41, 60)),
  )
  expect(lanesOf(model)).toEqual([
    ['E1', 0],
    ['E2', 0],
    ['E3', 0],
  ])
})

test('a nested signature takes the lane below the one enclosing it', () => {
  const model = makeModel(
    gffOf(feature('OUTER', 1, 40), feature('INNER', 8, 12)),
  )
  expect(lanesOf(model)).toEqual([
    ['OUTER', 0],
    ['INNER', 1],
  ])
})

test('a lane is reused once the band holding it has ended', () => {
  // A and B overlap, so B takes lane 1; C starts after A ends and goes back to
  // lane 0 rather than opening a third lane
  const model = makeModel(
    gffOf(feature('A', 1, 20), feature('B', 15, 30), feature('C', 25, 40)),
  )
  expect(lanesOf(model)).toEqual([
    ['A', 0],
    ['B', 1],
    ['C', 0],
  ])
})

test('a deep stack stays inside its own row', () => {
  // six signatures nested inside each other: every one overlaps every other, so
  // the row needs six lanes, more than fit at the nominal sub-row height
  const model = makeModel(
    gffOf(
      ...Array.from({ length: 6 }, (_, i) => feature(`D${i}`, 1 + i, 60 - i)),
    ),
  )
  expect(model.domainBands.get('seq1')![0]!.laneCount).toBe(6)
  for (const { top, bottom } of drawnBoxes(model)) {
    expect(top).toBeGreaterThanOrEqual(0)
    expect(bottom).toBeLessThanOrEqual(rowHeight)
  }
})

test('shallow stacks keep the nominal sub-row height', () => {
  const model = makeModel(
    gffOf(feature('OUTER', 1, 40), feature('INNER', 8, 12)),
  )
  expect(drawnBoxes(model)).toEqual([
    { top: 0, bottom: 4 },
    { top: 4, bottom: 8 },
  ])
})
