/**
 * DOM shims for driving `renderToSvg` outside a browser -- the SVG-export
 * tests, the README figure generator, and react-msaview-cli all need them.
 *
 * jsdom implements neither DOMMatrix nor a canvas 2D context, and
 * `@jbrowse/svgcanvas` needs both: it tracks the current transform as a real
 * matrix, and the renderers ask a throwaway canvas to measure text.
 *
 * The matrix stub has to accept the ARRAY constructor. svgcanvas normalizes
 * every transform through `new DOMMatrix([a, b, c, d, e, f])`, so a stub that
 * only takes six positional arguments silently binds the whole array to `a` and
 * leaves the rest undefined -- every emitted transform then carries `NaN` in its
 * x components, which no assertion on a drawn x-position can survive.
 */
import { CHAR_WIDTH_RATIO } from './measureTextCanvas.ts'

class HeadlessDOMMatrix {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number

  constructor(init?: number[]) {
    const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = init ?? []
    this.a = a
    this.b = b
    this.c = c
    this.d = d
    this.e = e
    this.f = f
  }

  multiply(o: HeadlessDOMMatrix) {
    return new HeadlessDOMMatrix([
      this.a * o.a + this.c * o.b,
      this.b * o.a + this.d * o.b,
      this.a * o.c + this.c * o.d,
      this.b * o.c + this.d * o.d,
      this.a * o.e + this.c * o.f + this.e,
      this.b * o.e + this.d * o.f + this.f,
    ])
  }

  translate(x: number, y = 0) {
    return this.multiply(new HeadlessDOMMatrix([1, 0, 0, 1, x, y]))
  }

  scale(x: number, y = x) {
    return this.multiply(new HeadlessDOMMatrix([x, 0, 0, y, 0, 0]))
  }
}

class HeadlessDOMPoint {
  constructor(
    public x = 0,
    public y = 0,
  ) {}

  matrixTransform(m: HeadlessDOMMatrix) {
    return new HeadlessDOMPoint(
      m.a * this.x + m.c * this.y + m.e,
      m.b * this.x + m.d * this.y + m.f,
    )
  }
}

/**
 * Install the shims, into `globalThis` by default. A Node caller that builds
 * its own jsdom passes that window instead, because Node has no global
 * HTMLCanvasElement to patch.
 *
 * Without `measureContext`, `measureText` reports 0.6em per character, close
 * enough to a real sans-serif average for layout and exactly predictable: a
 * test can compute the width a renderer will see. A caller with a real canvas,
 * such as react-msaview-cli with @napi-rs/canvas, passes one of its 2D
 * contexts as `measureContext` to measure with the installed fonts.
 *
 * `contextExtras` adds to the context a test hands out -- the raster test
 * supplies the ImageData methods that make the export take its image path.
 */
export function installHeadlessRenderEnv(
  win: unknown = globalThis,
  contextExtras: Partial<CanvasRenderingContext2D> = {},
  measureContext?: MeasureContext,
) {
  const g = globalThis as Record<string, unknown>
  g.DOMMatrix = HeadlessDOMMatrix
  g.DOMPoint = HeadlessDOMPoint
  const canvas: unknown =
    typeof win === 'object' && win !== null
      ? Reflect.get(win, 'HTMLCanvasElement')
      : undefined
  const prototype: unknown =
    typeof canvas === 'function' ? Reflect.get(canvas, 'prototype') : undefined
  if (typeof prototype !== 'object' || prototype === null) {
    throw new Error('the window given has no HTMLCanvasElement')
  }
  Reflect.set(prototype, 'getContext', function getContext() {
    let font = '10px sans-serif'
    return Object.assign(
      {
        get font() {
          return font
        },
        set font(v: string) {
          font = v
        },
        measureText: (t: string) => {
          if (measureContext) {
            measureContext.font = font
            return { width: measureContext.measureText(t).width }
          }
          return {
            width:
              t.length * (Number.parseFloat(font) || 10) * CHAR_WIDTH_RATIO,
          }
        },
      },
      contextExtras,
    )
  })
}

export interface MeasureContext {
  font: string
  measureText(text: string): { width: number }
}
