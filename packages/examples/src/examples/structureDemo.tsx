import { useEffect, useState } from 'react'

import { when } from 'mobx'
import { findStructures, networkLookups } from 'react-msaview-structure'

import type { MsaViewModel } from 'react-msaview'
import type {
  Lookups,
  StructureCandidate,
  SuperposeRowsResult,
} from 'react-msaview-structure'
import type { TmAlignment } from 'react-msaview-structure/panel'

export interface DemoProtein {
  row: string
  accession: string
  /** limits the lookup to this PDB entry and picks it over the AlphaFold model */
  pdbId?: string
}

function lookupsFor(signal: AbortSignal, pdbId?: string): Lookups {
  const network = networkLookups(signal)
  return pdbId
    ? {
        ...network,
        experimental: async accession =>
          (await network.experimental(accession)).filter(
            s => s.pdbId.toUpperCase() === pdbId,
          ),
      }
    : network
}

export interface MappingState {
  state: 'loading' | 'ready' | 'error'
  message: string
  /** every candidate found, by row, so a demo can offer a choice */
  candidates: Record<string, StructureCandidate[]>
}

export function structureKey({ id, asymId }: { id: string; asymId?: string }) {
  return `${id}:${asymId ?? ''}`
}

export function messageOf(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

/** each listed row that maps onto a structure, in the order given */
export function mappedTargets(model: MsaViewModel, rows: string[]) {
  return rows.flatMap(row => {
    const mapped = model.mappedStructures.find(m => m.row === row)
    return mapped ? [{ row, structureId: mapped.structure.id }] : []
  })
}

export function fitSummary(result: SuperposeRowsResult) {
  return result.fits
    .map(
      f =>
        `${f.row}: ${f.rmsd.toFixed(2)} Å over ${f.fitted} of ${f.considered} aligned CA pairs`,
    )
    .join(' · ')
}

export function tmSummary(fits?: Record<string, TmAlignment>) {
  return fits
    ? Object.entries(fits)
        .map(
          ([id, f]) =>
            `${id}: TM-score ${f.tmScore.toFixed(2)}, ${f.rmsd.toFixed(2)} Å over ${f.alignedLength} residues`,
        )
        .join(' · ')
    : 'Aligning by structure'
}

/**
 * Looks each row's structures up by its UniProt accession and writes the
 * AlphaFold model's mapping, or the candidate `pick` chooses, onto the model,
 * then calls `onReady`. The lookups run in the browser against AlphaFold DB and
 * RCSB, which is the point of the demo: no structure file or mapping is bundled
 * with it.
 */
export function useAccessionMappings(
  model: MsaViewModel,
  proteins: DemoProtein[],
  {
    pick = c => c[0],
    onReady,
  }: {
    pick?: (
      candidates: StructureCandidate[],
      row: string,
    ) => StructureCandidate | undefined
    onReady?: () => void
  } = {},
) {
  // a demo's proteins and callbacks are fixed for its life
  const [fixed] = useState({ proteins, pick, onReady })
  const [mappings, setMappings] = useState<MappingState>({
    state: 'loading',
    message: 'Looking up structures',
    candidates: {},
  })
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    void (async () => {
      try {
        await when(() => model.dataInitialized, { signal })
        const candidates: Record<string, StructureCandidate[]> = {}
        const chosen = []
        const problems: string[] = []
        const found = await Promise.all(
          fixed.proteins.map(async ({ row, accession, pdbId }) => {
            const result = await findStructures({
              rowName: row,
              rowSequence: model.rowSequence(row) ?? '',
              accession,
              lookups: lookupsFor(signal, pdbId),
            })
            return {
              row,
              result: pdbId
                ? {
                    ...result,
                    candidates: result.candidates.filter(
                      c => c.mapping.structure.id === pdbId,
                    ),
                  }
                : result,
            }
          }),
        )
        for (const { row, result } of found) {
          candidates[row] = result.candidates
          const picked = fixed.pick(result.candidates, row)
          if (picked) {
            chosen.push(picked.mapping)
          } else {
            problems.push(result.problem ?? `${row} has no structure`)
          }
        }
        if (signal.aborted) {
          return
        }
        model.setResidueMappings(chosen)
        setMappings({
          state: chosen.length > 0 ? 'ready' : 'error',
          message: problems.join(' '),
          candidates,
        })
        if (chosen.length > 0) {
          fixed.onReady?.()
        }
      } catch (e) {
        if (!signal.aborted) {
          setMappings({ state: 'error', message: messageOf(e), candidates: {} })
        }
      }
    })()
    return () => {
      controller.abort()
    }
  }, [model, fixed])
  return mappings
}
