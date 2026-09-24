// @vitest-environment jsdom
//
// The position ruler: column numbers over the alignment, in the reference row's
// own residue numbering when the view is drawn relative to a row.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { rulerCols, rulerStep } from './components/tracks/drawTracks.ts'
import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

beforeAll(() => {
  installSvgTestEnv()
})

const msa = `>seq1
${'ACDEFGHIKL'.repeat(10)}
>seq2
--${'ACDEFGHIKL'.repeat(10).slice(2)}`

function makeModel() {
  const model = createTestModel({ id: 'ruler', data: { msa } }, 1400)
  model.toggleTrack('position-ruler')
  return model
}

async function exportTicks(model: ReturnType<typeof makeModel>) {
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeTracks: true,
  })
  return [...svg.matchAll(/<text[^>]*font-size="10px"[^>]*>([^<]*)<\/text>/g)]
    .map(m => m[1]!)
    .filter(t => /^\d+$/.test(t))
}

test('the ruler is off until it is turned on', async () => {
  const model = createTestModel({ id: 'ruler-off', data: { msa } }, 1400)
  expect(model.turnedOnTracks.map(t => t.model.id)).not.toContain(
    'position-ruler',
  )
})

test('ticks are numbered by alignment column', async () => {
  const ticks = await exportTicks(makeModel())
  // column 1, then the 1-based multiples of the step the zoom leaves room for
  expect(ticks.slice(0, 4)).toEqual(['1', '5', '10', '15'])
})

test('column 1 leads each step, and a later block starts at a multiple', () => {
  expect(rulerCols(0, 30, 12)).toEqual([0, 4, 9, 14, 19, 24, 29])
  expect(rulerCols(0, 8, 30)).toEqual([0, 1, 3, 5, 7])
  expect(rulerCols(0, 3, 60)).toEqual([0, 1, 2])
  expect(rulerCols(10, 20, 12)).toEqual([14, 19])
})

test('a reference row numbers the ticks by its own residues', async () => {
  const model = makeModel()
  model.drawRelativeTo('seq2')

  const ticks = await exportTicks(model)
  // seq2 opens with two gaps: column 1 has no residue to name, so the first
  // tick is column 5, which is its residue 3
  expect(ticks[0]).toBe('3')
  expect(ticks.slice(0, 3)).toEqual(
    [4, 9, 14].map(col => `${model.visibleColToSeqPosOneBased('seq2', col)}`),
  )
})

test('the step grows as the columns shrink', () => {
  expect(rulerStep(16)).toBe(5)
  expect(rulerStep(1)).toBe(100)
  expect(rulerStep(0.2)).toBe(500)
  expect(rulerStep(60)).toBe(1)
})
