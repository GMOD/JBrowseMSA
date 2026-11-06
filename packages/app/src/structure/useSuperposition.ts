import { useState } from 'react'

import {
  distanceTrack,
  fetchText,
  findStructures,
  networkLookups,
  superposeRows,
} from 'react-msaview-structure'

import { messageOf, useRestartable } from './restartable'

import type { MsaViewModel } from 'react-msaview'
import type { SuperposeRowsResult } from 'react-msaview-structure'
import type { TmAlignment } from 'react-msaview-structure/panel'

export type FitBy = 'alignment' | 'tm-align'

export type Superposition =
  | { state: 'idle' }
  | { state: 'working'; message: string }
  | { state: 'done'; result: SuperposeRowsResult; problems: string[] }
  | { state: 'tm'; ids: string[]; fits?: Record<string, TmAlignment> }
  | { state: 'error'; message: string }

export const distanceTrackId = 'structure-ca-distance'
const maxRows = 12

/**
 * Superposes the rows that have an id: the selected ones when two or more are
 * selected, otherwise every one, up to twelve. A row with no mapping yet gets
 * its first candidate, and the fit is by the alignment's columns, limited to
 * the selected ones, or by TM-align in the panel.
 */
export function useSuperposition(model: MsaViewModel) {
  const [superposition, setSuperposition] = useState<Superposition>({
    state: 'idle',
  })
  const run = useRestartable()

  async function superpose(withId: string[], fitBy: FitBy) {
    const signal = run.restart()
    const working = (message: string) => {
      if (!signal.aborted) {
        setSuperposition({ state: 'working', message })
      }
    }
    try {
      const picked = model.selection?.rows?.filter(r => withId.includes(r))
      const pool = picked && picked.length > 1 ? picked : withId
      const rows = pool.slice(0, maxRows)
      const mappedRows = () => new Set(model.mappedStructures.map(m => m.row))
      const before = mappedRows()
      const missing = rows.filter(r => !before.has(r))
      const problems: string[] = []
      let finished = 0
      working(`Finding structures for ${missing.length} rows`)
      const found = await Promise.all(
        missing.map(async rowName => {
          try {
            const result = await findStructures({
              rowName,
              rowSequence: model.rowSequence(rowName) ?? '',
              lookups: networkLookups(signal),
            })
            const first = result.candidates[0]
            if (!first && result.problem) {
              problems.push(result.problem)
            }
            return first?.mapping
          } catch (e) {
            problems.push(`${rowName}: ${messageOf(e)}`)
            return undefined
          } finally {
            finished += 1
            working(`Finding structures ${finished} of ${missing.length}`)
          }
        }),
      )
      if (signal.aborted) {
        return
      }
      const have = mappedRows()
      model.setResidueMappings([
        ...model.residueMappings,
        ...found.flatMap(m => (m && !have.has(m.row) ? [m] : [])),
      ])
      if (pool.length > rows.length) {
        problems.push(
          `fitted the first ${maxRows} of ${pool.length} rows with an id`,
        )
      }
      const targets = rows.flatMap(rowName => {
        const m = model.mappedStructures.find(x => x.row === rowName)
        return m ? [{ row: rowName, structureId: m.structure.id }] : []
      })
      if (fitBy === 'tm-align') {
        const ids = [...new Set(targets.map(t => t.structureId))]
        if (ids.length < 2) {
          throw new Error('TM-align needs structures for at least two rows')
        }
        setSuperposition({ state: 'tm', ids })
        return
      }
      working('Fitting')
      const { selection } = model
      const result = await superposeRows({
        model,
        targets,
        columns: selection
          ? { start: selection.start - 1, end: selection.end - 1 }
          : undefined,
        fetchText: url => fetchText(url, signal),
      })
      if (signal.aborted) {
        return
      }
      model.setColumnTracks([
        ...model.columnTracks.filter(t => t.id !== distanceTrackId),
        distanceTrack(result, distanceTrackId),
      ])
      setSuperposition({ state: 'done', result, problems })
    } catch (e) {
      if (!signal.aborted) {
        setSuperposition({ state: 'error', message: messageOf(e) })
      }
    }
  }

  function clear() {
    run.abort()
    model.setColumnTracks(
      model.columnTracks.filter(t => t.id !== distanceTrackId),
    )
    setSuperposition({ state: 'idle' })
  }

  function setTmFits(fits: Record<string, TmAlignment>) {
    setSuperposition(prev => (prev.state === 'tm' ? { ...prev, fits } : prev))
  }

  return { superposition, superpose, clear, setTmFits }
}
