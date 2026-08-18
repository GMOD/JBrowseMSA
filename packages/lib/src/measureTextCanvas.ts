import { setFontSize } from './setFontSize.ts'

// Cached across calls: labelWidthMap measures every leaf label on every layout,
// and both createElement and getContext are far more expensive than measureText.
// `null` records that this environment has no 2d context, so the lookup is not
// retried on every label.
let ctxHandle: CanvasRenderingContext2D | null | undefined

function getCtx() {
  if (ctxHandle === undefined) {
    ctxHandle =
      typeof document === 'undefined'
        ? null
        : document.createElement('canvas').getContext('2d')
  }
  return ctxHandle
}

// Rough average glyph width as a fraction of the font size for the sans-serif
// stack the tree labels use. Only reached where there is no canvas to measure
// with (jsdom, SSR); estimating the label gutter beats throwing out of the
// layout getters that read this on every render.
const fallbackGlyphWidthRatio = 0.6

export function measureTextCanvas(text: string, fontSize: number) {
  const ctx = getCtx()
  if (!ctx) {
    return text.length * fontSize * fallbackGlyphWidthRatio
  }
  setFontSize(ctx, fontSize)
  return ctx.measureText(text).width
}
