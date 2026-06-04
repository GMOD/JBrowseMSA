// Replace just the px size token in a canvas font string, preserving the
// family (and optionally toggling bold). Accepts anything with a `font` field,
// so it works for both a real CanvasRenderingContext2D and the svgcanvas
// export context.
//
// [\d.]+ is load-bearing: it matches fractional sizes produced by smooth zoom.
// \d+ alone matches only the fraction ("8604" in "14.8604px"), splicing the new
// size into the middle to make an invalid string like "14 0.18px sans-serif" —
// which canvas silently rejects, freezing the font and making fillText draw
// nothing while fillRect still works.
export function setFontSize(
  ctx: { font: string },
  fontSize: number,
  bold = false,
) {
  ctx.font = ctx.font.replace(
    /(?:bold )?[\d.]+px/,
    `${bold ? 'bold ' : ''}${fontSize}px`,
  )
}
