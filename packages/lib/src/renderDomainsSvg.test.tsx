// @vitest-environment jsdom
//
// Verifies the SVG export draws the domain overlay: the boxes themselves across
// the full alignment width, and the color-key legend as a reserved column on the
// right. Polyfills mirror impgRender.test.tsx (svgcanvas needs
// DOMMatrix/DOMPoint + a measureText).
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import { installHeadlessRenderEnv } from './headlessRenderEnv.ts'
import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'

beforeAll(() => {
  enableStaticRendering(true)
  installHeadlessRenderEnv()
})

const msa = `>seq1
ACDEFGHIKL
>seq2
ACDE-GHIKL`

function makeModel({
  data = msa,
  start = 1,
  end = 5,
}: { data?: string; start?: number; end?: number } = {}) {
  const model = MSAModelF().create({
    id: 'domain-svg-test',
    type: 'MsaView',
    height: 400,
    msaFormat: 'fasta',
    data: { msa: data },
  })
  model.setWidth(800)
  model.setDomains({
    seq1: {
      xref: [{ id: 'seq1' }],
      matches: [
        {
          signature: {
            entry: {
              name: 'Kinase',
              accession: 'PF00069',
              description: 'Protein kinase domain',
            },
          },
          locations: [{ start, end }],
        },
      ],
    },
  })
  return model
}

function exportEntire(model: ReturnType<typeof makeModel>) {
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })
}

test('domain legend is drawn in the svg export when domains are shown', async () => {
  const model = makeModel()
  expect(model.actuallyShowDomains).toBe(true)
  expect(model.visibleDomainTypes.map(d => d.accession)).toEqual(['PF00069'])

  expect(await exportEntire(model)).toContain('Kinase')
})

test('no legend column when domains are hidden', async () => {
  const model = makeModel()
  model.setShowDomains(false)
  expect(model.actuallyShowDomains).toBe(false)

  expect(await exportEntire(model)).not.toContain('Kinase')
})

test('a domain box past the on-screen block size still draws', async () => {
  // the export renders the alignment in one pass, so the overlay has to be told
  // how wide that pass is; falling back to the 500px on-screen block size culled
  // every band to the left edge of a wide alignment
  const row = 'ACDEFGHIKL'.repeat(20)
  const model = makeModel({
    data: `>seq1\n${row}\n>seq2\n${row}`,
    start: 151,
    end: 190,
  })
  const band = model.domainBands.get('seq1')![0]!
  const x = band.startCol * model.colWidth
  expect(x).toBeGreaterThan(model.blockSize)

  const svg = await exportEntire(model)
  const fill = model.fillPalette.PF00069!
  const rects = [...svg.matchAll(/<rect[^>]*>/g)].map(m => m[0])
  expect(
    rects.some(r => r.includes(`fill="${fill}"`) && r.includes(`x="${x}"`)),
  ).toBe(true)
})
