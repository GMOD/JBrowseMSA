import React from 'react'

import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const pct = (n: number) => `${Math.round(n * 100)}%`

const ColumnStats = observer(function ({ model }: { model: MsaViewModel }) {
  const stats = model.mouseOverColumnStats
  if (!stats) {
    return null
  }
  const {
    col,
    total,
    conservation,
    propertyConservation,
    consensusLetter,
    consensusFraction,
    gapFraction,
    distribution,
  } = stats
  const top = distribution.slice(0, 6)
  return (
    <div>
      <b>Column {col + 1}</b> ({total} seqs)
      <br />
      Consensus: {consensusLetter || '-'} ({pct(consensusFraction)})
      <br />
      Conservation: {conservation.toFixed(2)}
      {propertyConservation === undefined ? null : (
        <>
          <br />
          Property conservation: {propertyConservation.toFixed(2)}
        </>
      )}
      <br />
      Gaps: {pct(gapFraction)}
      {top.length > 0 ? (
        <>
          <br />
          {top.map(([letter, count]) => (
            <span key={letter} style={{ marginRight: 8 }}>
              {letter} {pct(count / total)}
            </span>
          ))}
        </>
      ) : null}
    </div>
  )
})

export default ColumnStats
