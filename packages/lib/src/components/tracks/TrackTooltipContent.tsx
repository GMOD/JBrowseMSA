import React from 'react'

import { observer } from 'mobx-react'

import { columnLogoStack } from '../../sequenceLogo.ts'
import { barTrackValues } from './drawTracks.ts'

import type { MsaViewModel } from '../../model.ts'
import type { BasicTrack } from '../../types.ts'

const pct = (n: number) => `${Math.round(n * 100)}%`

const MAX_PARTNERS = 8

function ColumnLabel({ model, col }: { model: MsaViewModel; col: number }) {
  const { relativeTo } = model
  const pos = relativeTo
    ? model.visibleColToSeqPosOneBased(relativeTo, col)
    : undefined
  return (
    <b>
      Column {col + 1}
      {pos === undefined ? null : ` (${relativeTo}:${pos})`}
    </b>
  )
}

function BarTooltip({
  model,
  track,
  col,
}: {
  model: MsaViewModel
  track: BasicTrack
  col: number
}) {
  const { id, name } = track.model
  const value = barTrackValues(model, id)[col]
  return value === undefined ? null : (
    <div>
      <ColumnLabel model={model} col={col} />
      <br />
      {name}: {value.toFixed(2)}
    </div>
  )
}

function LogoTooltip({ model, col }: { model: MsaViewModel; col: number }) {
  const stats = model.columnStatsAt(col)
  if (!stats) {
    return null
  }
  const { total, consensusLetter, consensusFraction, gapFraction } = stats
  const stack = columnLogoStack(model.colStats, col, model.alphabetMaxBits)
  const bits = stack.reduce((a, b) => a + b.bits, 0)
  return (
    <div>
      <ColumnLabel model={model} col={col} /> ({total} seqs)
      <br />
      Information: {bits.toFixed(2)} bits
      <br />
      Consensus: {consensusLetter || '-'} ({pct(consensusFraction)})
      <br />
      Gaps: {pct(gapFraction)}
      <br />
      {stats.distribution.slice(0, 6).map(([letter, count]) => (
        <span key={letter} style={{ marginRight: 8 }}>
          {letter} {pct(count / total)}
        </span>
      ))}
    </div>
  )
}

function TextTooltip({
  model,
  track,
  col,
}: {
  model: MsaViewModel
  track: BasicTrack
  col: number
}) {
  const { name, data } = track.model
  const letter = data?.[col]
  return letter === undefined ? null : (
    <div>
      <ColumnLabel model={model} col={col} />
      <br />
      {name}: {letter === ' ' ? 'blank' : letter}
    </div>
  )
}

function ArcTooltip({
  model,
  track,
  col,
}: {
  model: MsaViewModel
  track: BasicTrack
  col: number
}) {
  const { name, arcs } = track.model
  const partners = (arcs ?? [])
    .filter(arc => arc.start === col || arc.end === col)
    .map(arc => (arc.start === col ? arc.end : arc.start) + 1)
  return partners.length === 0 ? null : (
    <div>
      <ColumnLabel model={model} col={col} />
      <br />
      {name}: pairs with {partners.slice(0, MAX_PARTNERS).join(', ')}
      {partners.length > MAX_PARTNERS ? '...' : null}
    </div>
  )
}

/**
 * One track's reading at the hovered column: a bar track's value, the logo's
 * information content and composition, the columns an arc joins, the letter on a
 * text track. `drawTrackBlock` dispatches on the same `kind`, so a new kind
 * needs a case in both.
 */
const TrackTooltipContent = observer(function ({
  model,
  track,
  col,
}: {
  model: MsaViewModel
  track: BasicTrack
  col: number
}) {
  switch (track.model.kind) {
    case 'bar': {
      return <BarTooltip model={model} track={track} col={col} />
    }
    case 'logo': {
      return <LogoTooltip model={model} col={col} />
    }
    case 'text': {
      return <TextTooltip model={model} track={track} col={col} />
    }
    case 'arc': {
      return <ArcTooltip model={model} track={track} col={col} />
    }
    case 'ruler': {
      return (
        <div>
          <ColumnLabel model={model} col={col} />
        </div>
      )
    }
  }
})

export default TrackTooltipContent
