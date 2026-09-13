// @vitest-environment jsdom
//
// The tracks sit between the header and the alignment inside a fixed-height,
// overflow-hidden widget, so every pixel they take is a pixel the rows do not
// get. Two getters used to compute the alignment viewport and neither
// subtracted them: the last rows scrolled under the bottom edge with no way to
// reach them, and fit-to-height sized the rows to a space that was not there.
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
  // the bottom of the alignment lands on the bottom of its viewport, not
  // somewhere under the tracks
  expect(-model.scrollY + model.msaAreaHeight).toBe(model.totalHeight)
})

test('fit leaves no gap and no scrollbar for half a pixel', () => {
  const model = makeModel()
  model.fit()
  expect(model.showVerticalScrollbar).toBe(false)
  expect(model.showHorizontalScrollbar).toBe(false)
  expect(model.totalHeight).toBeCloseTo(model.msaAreaHeight, 5)
  expect(model.totalWidth).toBeCloseTo(model.msaCanvasWidth, 5)
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
