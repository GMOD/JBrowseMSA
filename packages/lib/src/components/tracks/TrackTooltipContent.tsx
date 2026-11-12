import React from 'react'

import { observer } from 'mobx-react'

import { finiteNumber } from '../../columnTrackColor.ts'
import { columnLogoStack } from '../../sequenceLogo.ts'
import { HighlightReadout } from '../HighlightReadout.tsx'
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
      Column {model.visibleColToGlobalCol(col) + 1}
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
  const raw = model.columnTrackContent.get(id)?.raw
  const value = raw ? raw[col] : barTrackValues(model, id)[col]
  return value === undefined || columnHidden(model, id, col) ? null : (
    <div>
      <ColumnLabel model={model} col={col} />
      <br />
      {name}: {raw ? formatValue(value) : value.toFixed(2)}
    </div>
  )
}

function StripTooltip({
  model,
  track,
  col,
}: {
  model: MsaViewModel
  track: BasicTrack
  col: number
}) {
  const { id, name } = track.model
  const value = model.columnTrackContent.get(id)?.raw?.[col]
  return value === undefined || columnHidden(model, id, col) ? null : (
    <div>
      <ColumnLabel model={model} col={col} />
      <br />
      {name}: {formatValue(value)}
    </div>
  )
}

// whether a legend click hid the value a bar or strip track holds at `col`
function columnHidden(model: MsaViewModel, id: string, col: number) {
  return !!model.columnTrackColors.get(id)?.hiddenColumns?.[col]
}

// a supplied value as written, to three significant digits
function formatValue(value: number) {
  return Number.isInteger(value)
    ? `${value}`
    : `${Number(value.toPrecision(3))}`
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
    .map(arc => {
      const partner = (arc.start === col ? arc.end : arc.start) + 1
      const value = finiteNumber(arc.value)
      return value === undefined
        ? `${partner}`
        : `${partner} (${formatValue(value)})`
    })
  return partners.length === 0 ? null : (
    <div>
      <ColumnLabel model={model} col={col} />
      <br />
      {name}: pairs with {partners.slice(0, MAX_PARTNERS).join(', ')}
      {partners.length > MAX_PARTNERS ? '...' : null}
    </div>
  )
}

function FeatureTooltip({
  model,
  track,
  col,
}: {
  model: MsaViewModel
  track: BasicTrack
  col: number
}) {
  const { name, spans } = track.model
  const hits = (spans ?? []).filter(s => s.startCol <= col && col < s.endCol)
  return hits.length === 0 ? null : (
    <div>
      <ColumnLabel model={model} col={col} />
      <br />
      {name}
      {hits.map(({ annotation, lane }) => {
        const { id, start, end, attributes } = annotation
        const fields = Object.entries(attributes ?? {}).filter(
          ([field]) => field !== 'name',
        )
        return (
          <div key={lane}>
            <b>{annotation.name}</b> {id ? `${id} ` : null}
            {start === end ? start : `${start}–${end}`}
            {fields.length > 0 ? (
              <>
                <br />
                {fields
                  .map(([field, value]) => `${field}: ${value}`)
                  .join(', ')}
              </>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function HighlightTooltip({ model }: { model: MsaViewModel }) {
  const { hoveredHighlight, resolvedHighlights } = model
  const highlight = resolvedHighlights.find(h => h.key === hoveredHighlight)
  return highlight ? (
    <div>
      <HighlightReadout highlight={highlight} />
      <span style={{ opacity: 0.7 }}>
        Click to select, double-click to zoom
      </span>
    </div>
  ) : null
}

/**
 * One track's reading at the hovered column: a bar or strip track's value,
 * the logo's
 * information content and composition, the columns an arc joins, the letter on a
 * text track, the fields of every span a features track draws there. `drawTrackBlock` dispatches on the same `kind`, so a new kind
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
    case 'strip': {
      return <StripTooltip model={model} track={track} col={col} />
    }
    case 'logo': {
      return <LogoTooltip model={model} col={col} />
    }
    case 'text':
    case 'reference': {
      return <TextTooltip model={model} track={track} col={col} />
    }
    case 'arc': {
      return <ArcTooltip model={model} track={track} col={col} />
    }
    case 'features': {
      return <FeatureTooltip model={model} track={track} col={col} />
    }
    case 'highlights': {
      return <HighlightTooltip model={model} />
    }
    case 'ruler': {
      return (
        <div>
          <ColumnLabel model={model} col={col} />
        </div>
      )
    }
  }
  return null
})

export default TrackTooltipContent
