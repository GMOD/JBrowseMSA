import { labelFitFontSize } from '../../constants.ts'
import { measureTextCanvas } from '../../measureTextCanvas.ts'

import type { MsaViewModel } from '../../model.ts'
import type { Clade, ResolvedClade } from '../../types.ts'

// The bar of the bracket mark and the space around it, in px.
export const bracketBarWidth = 3
export const bracketGap = 4

// The widest gutter the bracket mark takes. A longer label is clipped, so one
// long name cannot squeeze the tree it annotates.
export const maxCladeGutterWidth = 140

/** whether a clade draws in the gutter: a bracket, or a highlight with a label */
function cladeInGutter(clade: Pick<Clade, 'mark' | 'label'>) {
  return (
    clade.mark === 'bracket' || (clade.mark === 'highlight' && !!clade.label)
  )
}

/** the pixel height of the rows a clade covers */
function cladeHeight(clade: ResolvedClade, rowHeight: number) {
  return (clade.rows[1] - clade.rows[0] + 1) * rowHeight
}

/**
 * Whether a label reads across the rows. It does where they are taller than the
 * font, and runs up the bar where they are not.
 */
function cladeLabelHorizontal(
  clade: ResolvedClade,
  rowHeight: number,
  fontSize: number,
) {
  return cladeHeight(clade, rowHeight) >= fontSize
}

/** the px between the left edge of the gutter and the label's own column */
function cladeLabelOffset(clade: Pick<Clade, 'mark'>) {
  return clade.mark === 'bracket'
    ? bracketGap + bracketBarWidth + bracketGap
    : bracketGap
}

/**
 * The gutter the bracket mark needs at the right of the tree area: the bar plus
 * the widest label read across at labelFitFontSize, zero where no clade draws
 * there, and at most maxCladeGutterWidth. The records size it, so a zoom, a
 * collapse or a focus leaves it as it is, and a renderer clips a label that
 * outgrows it.
 */
export function cladeGutterWidth(clades: Pick<Clade, 'mark' | 'label'>[]) {
  let widest = 0
  for (const clade of clades) {
    if (!cladeInGutter(clade)) {
      continue
    }
    const text = clade.label
      ? measureTextCanvas(clade.label, labelFitFontSize)
      : 0
    widest = Math.max(widest, cladeLabelOffset(clade) + text + bracketGap)
  }
  // a whole pixel, so the room the renderers measure against covers the label
  // the measurement here sized the gutter for
  return Math.min(maxCladeGutterWidth, Math.ceil(widest))
}

/**
 * The box each gutter label takes, in unscrolled tree-area px: from the
 * label's column to the right edge of the gutter, across the clade's rows. The
 * live view sets DOM text in it, and the SVG export a `<text>`.
 */
export function cladeLabelBoxes(
  model: Pick<
    MsaViewModel,
    | 'resolvedClades'
    | 'cladeGutterWidth'
    | 'rowHeight'
    | 'effectiveTreeAreaWidth'
    | 'fontSize'
  >,
) {
  const {
    resolvedClades,
    cladeGutterWidth,
    rowHeight,
    effectiveTreeAreaWidth,
    fontSize,
  } = model
  const gutterLeft = effectiveTreeAreaWidth - cladeGutterWidth
  return cladeGutterWidth === 0
    ? []
    : resolvedClades.flatMap((clade, index) => {
        const { label, markColor, rows } = clade
        if (!label || !cladeInGutter(clade)) {
          return []
        }
        const left = gutterLeft + cladeLabelOffset(clade)
        return [
          {
            key: `${rows[0]}-${rows[1]}-${index}`,
            label,
            color: markColor,
            left,
            top: rows[0] * rowHeight,
            width: effectiveTreeAreaWidth - left - bracketGap,
            height: cladeHeight(clade, rowHeight),
            horizontal: cladeLabelHorizontal(clade, rowHeight, fontSize),
          },
        ]
      })
}
