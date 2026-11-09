import React from 'react'

import type { ResolvedHighlight } from '../types.ts'

export function HighlightReadout({
  highlight,
}: {
  highlight?: ResolvedHighlight
}) {
  if (!highlight) {
    return null
  }
  const { label, row, start, end, startCol, endCol } = highlight
  const residues =
    start === undefined
      ? undefined
      : `${row ? `${row} ` : ''}${start === end ? start : `${start}–${end}`}`
  const columns =
    startCol === undefined || endCol === undefined
      ? undefined
      : `columns ${startCol + 1}–${endCol + 1}`
  return (
    <div>
      <b>{label ?? 'Highlight'}</b>
      {row && residues ? ` ${residues}` : null}
      {columns ? (
        <>
          <br />
          {row ? columns : (residues ?? columns)}
        </>
      ) : null}
    </div>
  )
}
