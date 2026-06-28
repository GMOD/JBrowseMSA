// @vitest-environment jsdom
//
// Verifies the domain color-key legend is drawn as a reserved column on the
// right of the SVG export when domains are shown. Polyfills mirror
// impgRender.test.tsx (svgcanvas needs DOMMatrix/DOMPoint + a measureText).
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'

class Mat {
  constructor(
    public a = 1,
    public b = 0,
    public c = 0,
    public d = 1,
    public e = 0,
    public f = 0,
  ) {}
  multiply(o: Mat) {
    return new Mat(
      this.a * o.a + this.c * o.b,
      this.b * o.a + this.d * o.b,
      this.a * o.c + this.c * o.d,
      this.b * o.c + this.d * o.d,
      this.a * o.e + this.c * o.f + this.e,
      this.b * o.e + this.d * o.f + this.f,
    )
  }
  translate(x: number, y = 0) {
    return this.multiply(new Mat(1, 0, 0, 1, x, y))
  }
  scale(x: number, y = x) {
    return this.multiply(new Mat(x, 0, 0, y, 0, 0))
  }
}
class Pt {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  matrixTransform(m: Mat) {
    return new Pt(
      m.a * this.x + m.c * this.y + m.e,
      m.b * this.x + m.d * this.y + m.f,
    )
  }
}

beforeAll(() => {
  enableStaticRendering(true)
  const g = globalThis as Record<string, unknown>
  g.DOMMatrix = Mat
  g.DOMPoint = Pt
  HTMLCanvasElement.prototype.getContext = function () {
    let font = '10px sans-serif'
    return {
      get font() {
        return font
      },
      set font(v: string) {
        font = v
      },
      measureText(t: string) {
        const size = Number.parseFloat(font) || 10
        return { width: t.length * size * 0.6 } as TextMetrics
      },
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

const msa = `>seq1
ACDEFGHIKL
>seq2
ACDE-GHIKL`

function makeModel() {
  const model = MSAModelF().create({
    id: 'domain-legend-test',
    type: 'MsaView',
    height: 400,
    msaFormat: 'fasta',
    data: { msa },
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
          locations: [{ start: 1, end: 5 }],
        },
      ],
    },
  })
  return model
}

test('domain legend is drawn in the svg export when domains are shown', async () => {
  const model = makeModel()
  expect(model.actuallyShowDomains).toBe(true)
  expect(model.visibleDomainTypes.map(d => d.accession)).toEqual(['PF00069'])

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })
  expect(svg).toContain('Kinase')
})

test('no legend column when domains are hidden', async () => {
  const model = makeModel()
  model.setShowDomains(false)
  expect(model.actuallyShowDomains).toBe(false)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })
  expect(svg).not.toContain('Kinase')
})
