// @vitest-environment jsdom
//
// The viewport export draws a minimap by default, and nothing covered it. The
// export lays the figure out on its own grid rather than the on-screen one, so
// the minimap has to be told how wide to draw -- reading a width off the model
// puts its trapezoid short of the alignment column beside it.
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
      measureText: (t: string) => ({
        width: t.length * (Number.parseFloat(font) || 10) * 0.6,
      }),
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

const width = 1000

function makeModel() {
  const row = 'ACDEFGHIKL'.repeat(40)
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 300,
    data: { msa: `>seq1\n${row}\n>seq2\n${row}` },
  })
  model.setWidth(width)
  return model
}

test('the exported minimap spans the exported alignment column', async () => {
  const model = makeModel()
  expect(model.showHorizontalScrollbar).toBe(true)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'viewport',
    includeMinimap: true,
    includeTracks: false,
  })

  // the minimap column runs from the tree area to the right edge of the figure
  const minimapWidth = width - model.treeAreaWidth
  const polygon = /<polygon[^>]*points="([^"]*)"/.exec(svg)?.[1]
  expect(polygon).toBeDefined()
  // bottom edge of the trapezoid reaches the full width it was given
  expect(polygon!.endsWith(`${minimapWidth},${model.minimapHeight - 12}`)).toBe(
    true,
  )
  // and the bar outline is drawn to the same width
  expect(svg).toContain(`width="${minimapWidth}"`)
})
