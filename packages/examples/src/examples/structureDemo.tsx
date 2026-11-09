import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { reaction, when } from 'mobx'
import {
  distanceTrack,
  findStructures,
  networkLookups,
  superposeRows,
} from 'react-msaview-structure'

import alignments from './structureAlignments.json'

import type { ReactNode } from 'react'
import type { MsaViewModel } from 'react-msaview'
import type {
  Lookups,
  StructureCandidate,
  SuperposeRowsResult,
} from 'react-msaview-structure'
import type { StructureColor, TmAlignment } from 'react-msaview-structure/panel'

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

function fitSummary(result: SuperposeRowsResult) {
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
 * AlphaFold model's mapping, or the candidate `pick` chooses, onto the model. The lookups run in the browser against AlphaFold DB and
 * RCSB, which is the point of the demo: no structure file or mapping is bundled
 * with it.
 */
export function useAccessionMappings(
  model: MsaViewModel,
  proteins: DemoProtein[],
  {
    pick = c => c[0],
  }: {
    pick?: (
      candidates: StructureCandidate[],
      row: string,
    ) => StructureCandidate | undefined
  } = {},
) {
  // a demo's proteins and pick are fixed for its life
  const [fixed] = useState({ proteins, pick })
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

const distal = alignments.globins.landmarks['distal His (E7)'].column
const proximal = alignments.globins.landmarks['proximal His (F8)'].column

/** the heme's two histidines in the globin alignment, as column highlights */
export const hemeHistidines = [
  { start: distal, end: distal, label: 'distal His', color: '#e41a1c' },
  { start: proximal, end: proximal, label: 'proximal His', color: '#ff7f00' },
]

interface Range {
  start: number
  end: number
}

export function isSelected(model: MsaViewModel, range?: Range) {
  const { selection } = model
  return range
    ? selection?.start === range.start && selection.end === range.end
    : selection === undefined
}

type FitStatus =
  | { state: 'idle' }
  | { state: 'fitting'; label: string }
  | { state: 'done'; label: string }
  | { state: 'error'; message: string }

export interface SelectionFit {
  status: FitStatus
  /** the last finished fit, kept while the next one runs */
  result?: SuperposeRowsResult
}

const distanceTrackId = 'ca-distance'

/**
 * Superposes the listed rows' structures on the selected columns, or on every
 * column when nothing is selected, and fits again 300 ms after the selection
 * or `refine` changes. Each fit replaces the CA distance track. While
 * `enabled` is false the hook fits nothing and removes the track.
 */
export function useSelectionFit(
  model: MsaViewModel,
  rows: string[],
  { enabled, refine }: { enabled: boolean; refine?: false },
): SelectionFit {
  const [fixedRows] = useState(rows)
  const [fit, setFit] = useState<SelectionFit>({ status: { state: 'idle' } })
  useEffect(() => {
    let latest = 0
    const otherTracks = () =>
      model.columnTracks.filter(t => t.id !== distanceTrackId)
    async function run(selection?: Range) {
      const id = ++latest
      const label = selection
        ? `columns ${selection.start}-${selection.end}`
        : 'every column'
      setFit(prev => ({ ...prev, status: { state: 'fitting', label } }))
      try {
        const result = await superposeRows({
          model,
          targets: mappedTargets(model, fixedRows),
          selection,
          refine,
        })
        if (id === latest) {
          model.setColumnTracks([
            ...otherTracks(),
            distanceTrack(result, distanceTrackId),
          ])
          setFit({ status: { state: 'done', label }, result })
        }
      } catch (e) {
        if (id === latest) {
          setFit(prev => ({
            ...prev,
            status: { state: 'error', message: messageOf(e) },
          }))
        }
      }
    }
    const dispose = enabled
      ? reaction(
          () => [model.selection?.start, model.selection?.end] as const,
          ([start, end]) => {
            void run(
              start === undefined || end === undefined
                ? undefined
                : { start, end },
            )
          },
          { fireImmediately: true, delay: 300 },
        )
      : undefined
    if (!enabled && otherTracks().length !== model.columnTracks.length) {
      model.setColumnTracks(otherTracks())
    }
    return () => {
      latest++
      dispose?.()
    }
  }, [model, fixedRows, enabled, refine])
  return enabled ? fit : { status: { state: 'idle' } }
}

export function FitSummary({ fit }: { fit: SelectionFit }) {
  const { status, result } = fit
  return status.state === 'fitting' ? (
    <Typography variant="body2" sx={{ mb: 1 }}>
      Fitting {status.label}…
    </Typography>
  ) : status.state === 'done' && result ? (
    <Alert severity="info" sx={{ mb: 1 }}>
      Fitted on {status.label}: {fitSummary(result)}
    </Alert>
  ) : status.state === 'error' ? (
    <Alert severity="error" sx={{ mb: 1 }}>
      {status.message}
    </Alert>
  ) : null
}

export function MappingStatus({ mappings }: { mappings: MappingState }) {
  return mappings.state === 'loading' ? (
    <Typography variant="body2">{mappings.message}…</Typography>
  ) : mappings.state === 'error' ? (
    <Alert severity="warning">{mappings.message}</Alert>
  ) : null
}

export interface Choice {
  label: string
  active: boolean
  choose: () => void
}

export function ChoiceButtons({
  choices,
  disabled,
  children,
}: {
  choices: Choice[]
  disabled?: boolean
  children?: ReactNode
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ mb: 1, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
    >
      {choices.map(({ label, active, choose }) => (
        <Button
          key={label}
          size="small"
          variant={active ? 'contained' : 'outlined'}
          disabled={disabled}
          onClick={choose}
        >
          {label}
        </Button>
      ))}
      {children}
    </Stack>
  )
}

export function StructureColorSelect({
  label,
  noneLabel,
  value,
  onChange,
}: {
  label: string
  noneLabel: string
  value: StructureColor
  onChange: (value: StructureColor) => void
}) {
  return (
    <>
      <Typography variant="body2">{label}</Typography>
      <Select
        size="small"
        value={value}
        onChange={e => {
          onChange(e.target.value)
        }}
      >
        <MenuItem value="none">{noneLabel}</MenuItem>
        <MenuItem value="conservation">Column conservation</MenuItem>
        <MenuItem value="scheme">Alignment colors</MenuItem>
      </Select>
    </>
  )
}

/** the alignment and a structure view side by side, stacked on a narrow page */
export function SideBySide({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: 'repeat(2, minmax(0, 1fr))',
        },
        alignItems: 'start',
      }}
    >
      {children}
    </Box>
  )
}
