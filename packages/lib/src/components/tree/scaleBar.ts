/**
 * The largest step of the 1/2/5 x 10^n ladder at or below `target`, which the
 * tree scale bar and the axis ticks both step along
 */
export function ladderStepBelow(target: number) {
  const magnitude = 10 ** Math.floor(Math.log10(target))
  const mantissa = target / magnitude
  return (mantissa >= 5 ? 5 : mantissa >= 2 ? 2 : 1) * magnitude
}

/**
 * A round branch-length step and its width in pixels: the largest 1/2/5 x 10^n
 * substitutions-per-site that fits in `maxPx`, aiming at about half of it.
 * Returns undefined in cladogram mode, where the x-positions carry no length.
 */
export function scaleBarLength(pxPerUnit: number, maxPx: number) {
  if (pxPerUnit <= 0 || maxPx < 20) {
    return undefined
  }
  const step = ladderStepBelow(maxPx / 2 / pxPerUnit)
  const px = step * pxPerUnit
  return px > maxPx
    ? undefined
    : {
        step,
        px,
        // a length of 0.02 reads as 0.02, not 0.020000000000000004
        label: `${Number(step.toPrecision(2))}`,
      }
}
