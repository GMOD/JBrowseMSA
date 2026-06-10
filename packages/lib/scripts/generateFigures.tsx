/**
 * Generates the example figures embedded in the READMEs by driving the
 * viewer's own SVG export (renderToSvg) headlessly under jsdom. No browser.
 *
 * Run with:  pnpm figures   (from the repo root)
 *
 * svgcanvas needs a few DOM bits jsdom omits — DOMMatrix/DOMPoint and a 2d
 * context for text metrics — so we polyfill the minimum it actually calls.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { test } from 'vitest'

import {
  domainsGFF,
  domainsMSA,
  nucleotideMSA,
  proteinMSA,
  proteinTree,
} from '../../examples/src/examples/exampleData.ts'
import { renderToSvg } from '../src/renderToSvg.tsx'

import MSAModelF from '../src/model.ts'

// minimal 2d-affine DOMMatrix: [a c e / b d f / 0 0 1]
class Mat {
  a = 1
  b = 0
  c = 0
  d = 1
  e = 0
  f = 0
  constructor(init?: number[]) {
    if (init) {
      ;[this.a, this.b, this.c, this.d, this.e, this.f] = init
    }
  }
  multiply(o: Mat) {
    return new Mat([
      this.a * o.a + this.c * o.b,
      this.b * o.a + this.d * o.b,
      this.a * o.c + this.c * o.d,
      this.b * o.c + this.d * o.d,
      this.a * o.e + this.c * o.f + this.e,
      this.b * o.e + this.d * o.f + this.f,
    ])
  }
  translate(x: number, y = 0) {
    return this.multiply(new Mat([1, 0, 0, 1, x, y]))
  }
  scale(x: number, y = x) {
    return this.multiply(new Mat([x, 0, 0, y, 0, 0]))
  }
}

class Pt {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  matrixTransform(m: Mat) {
    return new Pt(m.a * this.x + m.c * this.y + m.e, m.b * this.x + m.d * this.y + m.f)
  }
}

function setup() {
  enableStaticRendering(true)
  const g = globalThis as Record<string, unknown>
  g.DOMMatrix = Mat
  g.DOMPoint = Pt
  // svgcanvas only reads font + measureText off the 2d context
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
  } as typeof HTMLCanvasElement.prototype.getContext
}

const figures = [
  {
    name: 'example-protein',
    colorScheme: 'maeditor',
    data: { msa: proteinMSA, tree: proteinTree },
  },
  {
    name: 'example-nucleotide',
    colorScheme: 'nucleotide',
    treeAreaWidth: 120,
    data: { msa: nucleotideMSA, tree: '' },
  },
  {
    name: 'example-domains',
    colorScheme: 'clustalx_protein_dynamic',
    treeAreaWidth: 220,
    data: { msa: domainsMSA, tree: '', gff: domainsGFF },
  },
]

test('generate README figures', async () => {
  setup()
  const theme = createJBrowseTheme()
  const outDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../docs/media',
  )

  for (const fig of figures) {
    const model = MSAModelF().create({
      type: 'MsaView',
      height: 400,
      colorSchemeName: fig.colorScheme,
      data: fig.data,
    })
    if (fig.treeAreaWidth !== undefined) {
      model.setTreeAreaWidth(fig.treeAreaWidth)
    }
    model.setWidth(900)
    const svg = await renderToSvg(model, {
      theme,
      exportType: 'entire',
      includeMinimap: false,
      includeTracks: false,
    })
    fs.writeFileSync(path.join(outDir, `${fig.name}.svg`), svg)
    console.log(`wrote ${fig.name}.svg`)
  }
}, 60000)
