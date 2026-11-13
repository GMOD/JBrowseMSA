import { arcColorValue } from '../../columnTrackColor.ts'
import { cssColorOf } from '../../scales.ts'
import { arcsAtPoint } from './arcGeometry.ts'

import type { MsaViewModel } from '../../model.ts'
import type { Arc, BasicTrack } from '../../types.ts'
import type { TrackPointer } from './useTrackHover.ts'
import type { Theme } from '@mui/material'

function trackColors(model: MsaViewModel, track: BasicTrack) {
  const colors = model.columnTrackColors.get(track.model.id)
  const valueOf = (arc: Arc) => arcColorValue(arc, !!colors?.identity)
  return {
    colorOf: colors?.scale
      ? (arc: Arc) => colors.colorOf(valueOf(arc))
      : undefined,
    hidden: colors ? (arc: Arc) => colors.isHidden(valueOf(arc)) : undefined,
  }
}

/**
 * How an arc track paints each arc. An arc strokes in its own color, else the
 * color the track's scale gives its value, else the track's color, and an arc
 * whose value the legend hid draws nothing.
 */
export function arcPaint(model: MsaViewModel, track: BasicTrack, theme: Theme) {
  const { colorOf, hidden } = trackColors(model, track)
  const fallback = track.model.arcColor ?? theme.palette.text.primary
  return {
    strokeOf: (arc: Arc) =>
      (arc.color && cssColorOf(arc.color)) ?? colorOf?.(arc) ?? fallback,
    hidden,
  }
}

// the shown arcs under the pointer, nearest stroke first
export function hoveredArcs(
  model: MsaViewModel,
  track: BasicTrack,
  pointer: TrackPointer,
) {
  return arcsAtPoint({
    arcs: track.model.arcs ?? [],
    x: pointer.x,
    y: pointer.y,
    colWidth: model.colWidth,
    trackHeight: track.model.height,
    hidden: trackColors(model, track).hidden,
  })
}
