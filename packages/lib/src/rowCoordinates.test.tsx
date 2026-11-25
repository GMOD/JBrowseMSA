// @vitest-environment jsdom
//
// rowCoordinates: a row's residues numbered from an origin of the host's, as a
// reference row cut from a chromosome is, read by the position ruler, the
// tooltips and the Go to box
import React, { act } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { createRoot } from 'react-dom/client'
import { beforeAll, expect, test } from 'vitest'

import { goTo } from './components/dialogs/goTo.ts'
import HeaderInfoArea from './components/header/HeaderInfoArea.tsx'
import { coordinateRulerTicks } from './components/tracks/rulerTicks.ts'
import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'
import { parsePosition } from './rowCoordinates.ts'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { RowCoordinates } from './types.ts'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

beforeAll(() => {
  installSvgTestEnv()
})

// the reference has a three-column insertion after its 12th base, which the
// read carries
const reference = 'ACGTACGTACGT---ACGTACGTACGTACGTACGTACGTACGTACGT'
const read = 'ACGTACGTACGTTTTACGTACGTACGTACGTACGTACGTACGTACGT'
const msa = `>reference\n${reference}\n>read\n${read}`

const chrX: RowCoordinates = {
  row: 'reference',
  name: 'chrX',
  start: 146993531,
}

function makeModel(rowCoordinates: RowCoordinates[] = [chrX]) {
  const model = createTestModel(
    {
      data: { msa },
      relativeTo: 'reference',
      rowCoordinates,
      colWidth: 10,
      turnedOffTracks: { 'position-ruler': false },
    },
    1400,
  )
  return model
}

// the column of the reference row's residue holding a chromosome position
function columnOf(position: number) {
  const residue = position - chrX.start + 1
  return residue <= 12 ? residue - 1 : residue + 2
}

async function exportedTicks(model: ReturnType<typeof makeModel>) {
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeTracks: true,
  })
  return [
    ...svg.matchAll(
      /<text[^>]*font-size="10px" x="([\d.]+)"[^>]*>([\d,]+)<\/text>/g,
    ),
  ].map(m => ({ x: Number(m[1]), label: m[2]! }))
}

test('the ruler ticks round positions of the reference row, over their residues', async () => {
  const model = makeModel()
  const ticks = await exportedTicks(model)
  expect(ticks.map(t => t.label)).toEqual([
    '146,993,540',
    '146,993,550',
    '146,993,560',
    '146,993,570',
  ])
  // past the insertion, each tick still sits over the residue it names
  const { colWidth } = model
  expect(ticks.map(t => t.x)).toEqual(
    [146993540, 146993550, 146993560, 146993570].map(
      p => (columnOf(p) + 0.5) * colWidth,
    ),
  )
})

test('the step widens until a nine-digit label clears the next', () => {
  const ticks = (colWidth: number) =>
    coordinateRulerTicks({
      residueColumns: Array.from({ length: 2000 }, (_, i) => i),
      coordinates: chrX,
      colWidth,
      visibleCol: col => col,
      measure: text => text.length * 6,
    }).ticks.map(t => t.label)
  expect(ticks(10).slice(0, 3)).toEqual([
    '146,993,540',
    '146,993,550',
    '146,993,560',
  ])
  expect(ticks(2).slice(0, 3)).toEqual([
    '146,993,550',
    '146,993,600',
    '146,993,650',
  ])
})

test('a tick that hidden columns pack against the last label is left out', () => {
  // the columns of residues 11 to 15 are hidden, so 146,993,550 lands five
  // columns after 146,993,540, closer than its label is wide
  const residueColumns = Array.from({ length: 200 }, (_, i) => i)
  const visibleCol = (col: number) =>
    col < 10 ? col : col < 15 ? undefined : col - 5
  const { ticks } = coordinateRulerTicks({
    residueColumns,
    coordinates: chrX,
    colWidth: 10,
    visibleCol,
    measure: text => text.length * 6,
  })
  expect(ticks.map(t => t.label).slice(0, 3)).toEqual([
    '146,993,540',
    '146,993,560',
    '146,993,570',
  ])
  for (const [a, b] of ticks.slice(1).map((t, i) => [ticks[i]!, t])) {
    expect((b!.col - a!.col) * 10).toBeGreaterThanOrEqual(6 * 11 + 12)
  }
})

test('a protein row starting at residue 120 numbers from 120', async () => {
  const model = makeModel([{ row: 'reference', start: 120 }])
  const ticks = await exportedTicks(model)
  // four-digit labels need less room, so the step is 5
  expect(ticks.map(t => t.label).slice(0, 3)).toEqual(['120', '125', '130'])
  expect(model.rowPositionLabel('reference', 1)).toBe('reference:120')
})

test('coordinates on a row other than relativeTo leave the ruler numbering residues', async () => {
  const withOther = makeModel([{ row: 'read', name: 'chrX', start: 1000 }])
  const without = makeModel([])
  expect(await exportedTicks(withOther)).toEqual(await exportedTicks(without))
  expect(withOther.coordinateRuler).toBeUndefined()
})

test('the tooltips name the reference position in its coordinates', () => {
  const model = makeModel()
  expect(model.rowPositionLabel('reference', 10)).toBe('chrX:146,993,540')
  expect(model.rowPositionLabel('read', 10)).toBe('read:10')
  // cellAt stays in residues, the coordinates a host writes highlights in
  expect(model.cellAt(9, 0).residue).toBe(10)
})

// static rendering, which the export tests install, leaves an observer alone
// after a change, so each reading renders afresh
function headerReadout(model: ReturnType<typeof makeModel>) {
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() => {
    root.render(<HeaderInfoArea model={model} />)
  })
  const text = container.textContent
  act(() => {
    root.unmount()
  })
  return text
}

test('the header readout prints the hovered row in its coordinates', () => {
  const model = makeModel()
  model.setMousePos(columnOf(146993540), 0)
  expect(headerReadout(model)).toBe('reference chrX:146,993,540 (C)')
  model.setMousePos(columnOf(146993540), 1)
  expect(headerReadout(model)).toBe('read:10 (C)')
  model.setRowCoordinates([{ row: 'reference', start: 146993531 }])
  model.setMousePos(columnOf(146993540), 0)
  expect(headerReadout(model)).toBe('reference:146,993,540 (C)')
})

test('the Go to box reads positions in the coordinates', () => {
  const model = makeModel()
  expect(goTo(model, 'chrX:146,993,550')).toBe(true)
  expect(model.mouseCol).toBe(columnOf(146993550))
  expect(model.mouseRow).toBe(0)
  expect(goTo(model, '146993560')).toBe(true)
  expect(model.mouseCol).toBe(columnOf(146993560))
  expect(goTo(model, 'reference:146,993,541')).toBe(true)
  expect(model.mouseCol).toBe(columnOf(146993541))
  // the read has no coordinates, so N is its residue
  expect(goTo(model, 'read:13')).toBe(true)
  expect(model.mouseCol).toBe(12)
  expect(goTo(model, 'chrX:146,993,530')).toBe(false)
  expect(goTo(model, 'chrY:146,993,540')).toBe(false)
})

test('a position is digits, with or without thousands separators', () => {
  expect(parsePosition('146,993,540')).toBe(146993540)
  expect(parsePosition('146993540')).toBe(146993540)
  expect(parsePosition('1,46,993')).toBeUndefined()
  expect(parsePosition('12a')).toBeUndefined()
})

test('the coordinates travel in the snapshot, and an unset layer adds nothing', () => {
  const model = makeModel()
  const reopened = MSAModelF().create(getSnapshot(model))
  expect(reopened.rowPositionLabel('reference', 10)).toBe('chrX:146,993,540')
  expect(getSnapshot(makeModel([])).rowCoordinates).toBeUndefined()
})
