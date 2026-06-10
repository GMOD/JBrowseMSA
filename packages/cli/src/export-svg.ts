import * as fs from 'node:fs'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { JSDOM } from 'jsdom'
import { enableStaticRendering } from 'mobx-react'

// minimal 2d-affine DOMMatrix needed by svgcanvas: [a c e / b d f / 0 0 1]
class Mat {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
  constructor(init?: number[]) {
    if (init && init.length >= 6) {
      this.a = init[0]!; this.b = init[1]!; this.c = init[2]!
      this.d = init[3]!; this.e = init[4]!; this.f = init[5]!
    }
  }
  multiply(o: Mat) {
    return new Mat([
      this.a * o.a + this.c * o.b, this.b * o.a + this.d * o.b,
      this.a * o.c + this.c * o.d, this.b * o.c + this.d * o.d,
      this.a * o.e + this.c * o.f + this.e, this.b * o.e + this.d * o.f + this.f,
    ])
  }
  translate(x: number, y = 0) { return this.multiply(new Mat([1, 0, 0, 1, x, y])) }
  scale(x: number, y = x)    { return this.multiply(new Mat([x, 0, 0, y, 0, 0])) }
}

class Pt {
  constructor(public x = 0, public y = 0) {}
  matrixTransform(m: Mat) {
    return new Pt(m.a * this.x + m.c * this.y + m.e, m.b * this.x + m.d * this.y + m.f)
  }
}

function makeCtx() {
  let font = '10px sans-serif'
  return {
    get font() { return font },
    set font(v: string) { font = v },
    measureText(t: string) {
      const size = Number.parseFloat(font) || 10
      return { width: t.length * size * 0.6 } as TextMetrics
    },
  } as unknown as CanvasRenderingContext2D
}

function setupPolyfills() {
  enableStaticRendering(true)

  // jsdom provides document/window/SVGElement needed by svgcanvas and measureTextCanvas
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  const g = globalThis as Record<string, unknown>
  g['window'] = dom.window
  g['document'] = dom.window.document
  g['DOMMatrix'] = Mat
  g['DOMPoint'] = Pt
  // override jsdom's stub canvas context with our text-metrics mock
  ;(dom.window.HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = makeCtx
}

export async function exportSvg({
  msaFile,
  treeFile,
  gffFile,
  outputFile,
  colorScheme,
  height,
  width,
  treeAreaWidth,
}: {
  msaFile: string
  treeFile?: string
  gffFile?: string
  outputFile: string
  colorScheme: string
  height: number
  width: number
  treeAreaWidth?: number
}) {
  setupPolyfills()

  const { MSAModelF, renderToSvg } = await import('react-msaview')
  const theme = createJBrowseTheme()

  const msa = fs.readFileSync(msaFile, 'utf8')
  const tree = treeFile ? fs.readFileSync(treeFile, 'utf8') : ''
  const gff = gffFile ? fs.readFileSync(gffFile, 'utf8') : undefined

  const model = MSAModelF().create({
    type: 'MsaView',
    height,
    colorSchemeName: colorScheme,
    data: { msa, tree, ...(gff ? { gff } : {}) },
  })
  if (treeAreaWidth !== undefined) {
    model.setTreeAreaWidth(treeAreaWidth)
  }
  model.setWidth(width)

  const svg = await renderToSvg(model, {
    theme,
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })
  fs.writeFileSync(outputFile, svg)
}
