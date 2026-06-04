// Wheel / trackpad-pinch delta handling, adapted from @jbrowse/core's
// util/wheelZoom (not yet in our pinned @jbrowse/core). Turns raw wheel deltas
// into a per-frame zoom factor that feels consistent across fine trackpad
// pinches and coarse mouse notches.

// Fixed divisor for plain-wheel scroll-zoom mode, where deltas are big notches.
export const SCROLL_ZOOM_DIVISOR = 500

// Cap the zoom change per millisecond so a burst of momentum-scroll events
// coalesced into one frame can't jump the zoom level (0.2 per ~60fps frame).
const MAX_ZOOM_RATE_PER_MS = 0.2 / 16.67

// Convert a wheel delta to pixels regardless of the browser's deltaMode; some
// browsers/mice report lines or pages instead of pixels.
export function normalizeWheelDelta(delta: number, mode: number) {
  if (mode === 1) {
    return delta * 16 // DOM_DELTA_LINE
  }
  if (mode === 2) {
    return delta * 100 // DOM_DELTA_PAGE
  }
  return delta // DOM_DELTA_PIXEL
}

// Adaptive divisor: tiny pinch deltas zoom in larger steps, big mouse notches
// in finer steps, so a trackpad pinch and a mouse wheel feel similar.
export function getZoomNormalizer(deltaY: number) {
  const abs = Math.abs(deltaY)
  if (abs < 6) {
    return 25
  }
  if (abs > 150) {
    return 500
  }
  if (abs > 30) {
    return 150
  }
  return 75
}

// Turn accumulated, normalized zoom intent into a colWidth/rowHeight multiplier.
// Positive accum (wheel toward user) zooms out (factor < 1); negative zooms in.
export function zoomFactorFromAccum(zoomAccum: number, elapsedMs: number) {
  const max = MAX_ZOOM_RATE_PER_MS * elapsedMs
  const d = Math.max(-max, Math.min(max, zoomAccum))
  return d > 0 ? 1 / (1 + d) : 1 - d
}
