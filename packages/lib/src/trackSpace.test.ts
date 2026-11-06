// @vitest-environment jsdom
//
// The tracks sit between the header and the alignment inside a fixed-height
// widget, so the alignment viewport has to subtract their height.
import { autorun } from 'mobx'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

const msa = Array.from(
  { length: 100 },
  (_, i) => `>row${i}\nMKAANSEQWERTYIPLV`,
).join('\n')

function makeModel() {
  const model = MSAModelF().create({
    id: 'track-space-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 500,
    data: { msa },
  })
  model.setWidth(800)
  return model
}

test('the tracks come out of the alignment viewport', () => {
  const model = makeModel()
  expect(model.totalTrackAreaHeight).toBeGreaterThan(0)
  expect(model.msaAreaHeight).toBe(
    model.height - model.headerHeight - model.totalTrackAreaHeight,
  )
})

test('scrolling to the bottom reaches the last row', () => {
  const model = makeModel()
  expect(model.showVerticalScrollbar).toBe(true)
  model.setScrollY(-Infinity)
  expect(-model.scrollY + model.msaAreaHeight).toBe(model.totalHeight)
})

test('fit leaves no gap and no scrollbar for half a pixel', () => {
  const model = makeModel()
  model.fit()
  expect(model.showVerticalScrollbar).toBe(false)
  expect(model.showHorizontalScrollbar).toBe(false)
  expect(model.totalHeight).toBeCloseTo(model.msaAreaHeight, 5)
})

test('fit shrinks into the window but never grows past the default size', () => {
  const model = makeModel()
  model.fit()
  // 17 columns fit at the default width with room to spare
  expect(model.colWidth).toBe(12)
  expect(model.rowHeight).toBeLessThan(16)
  model.fitHorizontally()
  expect(model.totalWidth).toBeCloseTo(model.msaCanvasWidth, 5)
})

test('fit reaches below a pixel per row for a tall alignment', () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 500,
    data: {
      msa: Array.from({ length: 1000 }, (_, i) => `>r${i}\nMKAA`).join('\n'),
    },
  })
  model.setWidth(800)
  model.fit()
  expect(model.rowHeight).toBeLessThan(1)
  expect(model.showVerticalScrollbar).toBe(false)
})

test('fit measures against the geometry it produces', () => {
  const model = makeModel()
  // wide enough that the columns overflow and the minimap is up before the fit
  model.setColWidth(80)
  expect(model.showHorizontalScrollbar).toBe(true)
  model.fit()
  // the minimap is gone afterwards, and the rows fill the space it had
  expect(model.showHorizontalScrollbar).toBe(false)
  expect(model.totalHeight).toBeCloseTo(model.msaAreaHeight, 5)
})

test('closing a track hands its space to the rows', () => {
  const model = makeModel()
  const before = model.msaAreaHeight
  const track = model.turnedOnTracks[0]!
  model.toggleTrack(track.model.id)
  expect(model.msaAreaHeight).toBe(before + track.model.height)
})

test('toggling a track back to its default leaves nothing in the snapshot', () => {
  const model = makeModel()
  model.toggleTrack('sequence-logo')
  model.toggleTrack('sequence-logo')
  model.toggleTrack('conservation')
  model.toggleTrack('conservation')
  expect(JSON.parse(JSON.stringify(model)).turnedOffTracks).toBeUndefined()
})

test('a zoom does not rebuild the track objects', () => {
  const model = makeModel()
  // observed the way the track area observes them, so the computeds cache
  const dispose = autorun(() => model.turnedOnTracks)
  const before = model.turnedOnTracks.map(t => t.model)

  model.setRowHeight(model.rowHeight * 1.5)
  model.setColWidth(model.colWidth * 1.5)

  // each canvas redraws when its track object changes
  const after = model.turnedOnTracks.map(t => t.model)
  expect(after.length).toBe(before.length)
  for (let i = 0; i < after.length; i++) {
    expect(after[i]).toBe(before[i])
  }
  dispose()
})

test('hovering an alignment with no annotations changes nothing', () => {
  const model = makeModel()
  const dispose = autorun(() => model.mouseOverDomains)
  const before = model.mouseOverDomains
  model.setMousePos(3, 2)
  expect(model.mouseOverDomains).toBe(before)
  model.setMousePos(4, 2)
  expect(model.mouseOverDomains).toBe(before)
  dispose()
})
