import { useState } from 'react'

import {
  FOLDSEEK_MAX_RESIDUES,
  fetchText,
  foldseekCandidates,
  foldseekQuery,
  searchFoldseek,
} from 'react-msaview-structure'

import { messageOf, useRestartable } from './restartable'

import type { MsaViewModel } from 'react-msaview'
import type { StructureCandidate } from 'react-msaview-structure'

export type FoldseekSearch =
  | { state: 'idle' }
  | { state: 'running'; row: string; message: string }
  | { state: 'done'; row: string; candidates: StructureCandidate[] }
  | { state: 'error'; row: string; message: string }

/**
 * Sends a row's sequence to Foldseek and maps the hits. Each state names its
 * row, so a search that waits on the queue for minutes keeps its result after
 * the user clicks another row.
 */
export function useFoldseekSearch(model: MsaViewModel) {
  const [foldseek, setFoldseek] = useState<FoldseekSearch>({ state: 'idle' })
  const run = useRestartable()

  async function search(row: string) {
    const rowSequence = model.rowSequence(row) ?? ''
    const { sequence } = foldseekQuery(rowSequence)
    if (sequence.length > FOLDSEEK_MAX_RESIDUES) {
      setFoldseek({
        state: 'error',
        row,
        message: `Foldseek's 3Di predictor takes at most ${FOLDSEEK_MAX_RESIDUES} residues and ${row} has ${sequence.length}.`,
      })
      return
    }
    if (sequence.length < 20) {
      setFoldseek({
        state: 'error',
        row,
        message: `${row} has ${sequence.length} standard residues, too few to search with.`,
      })
      return
    }
    const signal = run.restart()
    setFoldseek({ state: 'running', row, message: 'Starting' })
    try {
      const hits = await searchFoldseek(sequence, {
        signal,
        onStatus: message => {
          if (!signal.aborted) {
            setFoldseek({ state: 'running', row, message })
          }
        },
      })
      const candidates = await foldseekCandidates({
        rowName: row,
        rowSequence,
        hits,
        fetchText: url => fetchText(url, signal),
      })
      if (!signal.aborted) {
        setFoldseek({ state: 'done', row, candidates })
      }
    } catch (e) {
      if (!signal.aborted) {
        setFoldseek({ state: 'error', row, message: messageOf(e) })
      }
    }
  }

  return { foldseek, search }
}
