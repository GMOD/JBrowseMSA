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
export class HeadlessDOMMatrix {
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

export class HeadlessDOMPoint {
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
 * `measureText` reports 0.6em per character, close enough to a real sans-serif
 * average for layout and, more usefully, exactly predictable: a caller can
 * compute the width a renderer will see rather than hardcoding a number
 * measured from one machine's fonts.
 */
export function installHeadlessRenderEnv(win: unknown = globalThis) {
  const g = globalThis as Record<string, unknown>
  g.DOMMatrix = HeadlessDOMMatrix
  g.DOMPoint = HeadlessDOMPoint
  const canvas = (win as { HTMLCanvasElement: typeof HTMLCanvasElement })
    .HTMLCanvasElement
  canvas.prototype.getContext = function () {
    let font = '10px sans-serif'
    return {
      get font() {
        return font
      },
      set font(v: string) {
        font = v
      },
      measureText: (t: string) => ({
        width: t.length * (Number.parseFloat(font) || 10) * CHAR_WIDTH_RATIO,
      }),
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
}

/** the per-character width factor `measureText` above reports */
export const CHAR_WIDTH_RATIO = 0.6
