// @vitest-environment jsdom
//
// The logo track is the first track kind whose letters are drawn under a
// per-letter transform rather than at a fixed size, so it is also the first that
// can silently draw nothing if the export context loses that transform. These
// tests go through the real SVG export to pin the whole path: the track is off
// until asked for, the stack is ordered and scaled, and the glyphs land inside
// the track's own band.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import MSAModelF from './model.ts'
import { TEST_CHAR_WIDTH_RATIO, installRenderTestEnv } from './renderTestEnv.ts'
import { renderToSvg } from './renderToSvg.tsx'

beforeAll(() => {
  enableStaticRendering(true)
  installRenderTestEnv()
})

// column 0 is fully conserved A, column 1 is a 3:1 split of C over G, and
// column 2 is an even four-way split carrying no information at all
const msa = `>s1\nACA\n>s2\nACC\n>s3\nACG\n>s4\nAGT\n`
const colWidth = 40

function makeModel() {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    colWidth,
    data: { msa },
  })
  model.setWidth(1000)
  return model
}

async function exportSvg(model: ReturnType<typeof makeModel>) {
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeTracks: true,
  })
}

// The logo's glyphs are the only <text> drawn at the track's own font size, and
// the only ones carrying a non-unit vertical scale, which is what separates them
// from the alignment letters and tree labels in the same document.
function logoGlyphs(svg: string, fontSize: number) {
  return [
    ...svg.matchAll(
      /<text[^>]*font-size="([\d.]+)px"[^>]*transform="matrix\(([^)]*)\)"[^>]*>([A-Z])<\/text>/g,
    ),
  ]
    .filter(m => Number(m[1]) === fontSize)
    .map(m => {
      const [sx, , , sy, tx, ty] = m[2]!.split(/[\s,]+/).map(Number)
      return { letter: m[3]!, sx: sx!, sy: sy!, x: tx!, y: ty! }
    })
}

async function glyphsOf(model: ReturnType<typeof makeModel>) {
  return logoGlyphs(await exportSvg(model), model.sequenceLogoTrackHeight)
}

test('the logo track is hidden until it is asked for', () => {
  const model = makeModel()
  expect(model.tracks.map(t => t.model.id)).toContain('sequence-logo')
  expect(model.turnedOnTracks.map(t => t.model.id)).not.toContain(
    'sequence-logo',
  )
  // and being default-off writes nothing into the shareable snapshot
  expect(model.turnedOffTracks.size).toBe(0)
})

test('toggling it on shows it, and off again hides it', () => {
  const model = makeModel()
  model.toggleTrack('sequence-logo')
  expect(model.turnedOnTracks.map(t => t.model.id)).toContain('sequence-logo')
  model.toggleTrack('sequence-logo')
  expect(model.turnedOnTracks.map(t => t.model.id)).not.toContain(
    'sequence-logo',
  )
})

test('an on-by-default track still toggles off and back on', () => {
  const model = makeModel()
  expect(model.turnedOnTracks.map(t => t.model.id)).toContain('conservation')
  model.toggleTrack('conservation')
  expect(model.turnedOnTracks.map(t => t.model.id)).not.toContain(
    'conservation',
  )
  model.toggleTrack('conservation')
  expect(model.turnedOnTracks.map(t => t.model.id)).toContain('conservation')
})

test('the conserved column draws one full-height letter', async () => {
  const model = makeModel()
  model.toggleTrack('sequence-logo')
  const col0 = (await glyphsOf(model)).filter(g => g.x === 0)

  expect(col0.map(g => g.letter)).toEqual(['A'])
  // a fully conserved nucleotide column is 2 of 2 bits, so the glyph stretches
  // to the whole track height over the cap height of the reference font
  expect(col0[0]!.sy).toBeCloseTo(1 / 0.72, 5)
})

test('a split column stacks the minor letter below the major one', async () => {
  const model = makeModel()
  model.toggleTrack('sequence-logo')
  const col1 = (await glyphsOf(model)).filter(g => g.x === colWidth)

  // ascending order means C (3 of 4) is drawn last, so it ends up on top
  expect(col1.map(g => g.letter)).toEqual(['G', 'C'])
  const [g, c] = col1
  expect(c!.sy).toBeGreaterThan(g!.sy)
  // and the taller letter sits higher up the track (smaller y is nearer the top)
  expect(c!.y).toBeLessThan(g!.y)
})

test('the uninformative column draws nothing', async () => {
  const model = makeModel()
  model.toggleTrack('sequence-logo')
  const glyphs = await glyphsOf(model)
  expect(glyphs.filter(g => g.x === colWidth * 2)).toEqual([])
  // the other two columns did draw, so an empty column 2 is the logo's own
  // verdict rather than the whole track missing
  expect(glyphs).toHaveLength(3)
})

test('every glyph stays inside the track band', async () => {
  const model = makeModel()
  model.toggleTrack('sequence-logo')

  // the export stacks the tracks, so the logo's band is offset by whatever is
  // drawn above it -- assert against that band rather than against 0..height,
  // which would pass only while the logo happened to be the first track
  const above = model.turnedOnTracks
    .slice(
      0,
      model.turnedOnTracks.findIndex(t => t.model.id === 'sequence-logo'),
    )
    .reduce((a, t) => a + t.model.height, 0)
  const bandTop = above
  const bandBottom = above + model.sequenceLogoTrackHeight

  const glyphs = await glyphsOf(model)
  expect(glyphs.length).toBeGreaterThan(0)
  for (const glyph of glyphs) {
    // baselines run from the band's bottom edge upward, never past either end
    expect(glyph.y).toBeGreaterThan(bandTop)
    expect(glyph.y).toBeLessThanOrEqual(bandBottom)
  }
})

test('letters are stretched to fill their column', async () => {
  const model = makeModel()
  model.toggleTrack('sequence-logo')
  const glyphs = await glyphsOf(model)

  const expected =
    colWidth / (model.sequenceLogoTrackHeight * TEST_CHAR_WIDTH_RATIO)
  for (const glyph of glyphs) {
    expect(glyph.sx).toBeCloseTo(expected, 5)
  }
})

test('the logo appears in the export only when the track is on', async () => {
  const off = makeModel()
  expect(await glyphsOf(off)).toEqual([])

  const on = makeModel()
  on.toggleTrack('sequence-logo')
  expect((await glyphsOf(on)).length).toBeGreaterThan(0)
})
