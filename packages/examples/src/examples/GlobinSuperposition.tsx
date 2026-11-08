import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'
import { distanceTrack, superposeRows } from 'react-msaview-structure'
import { StructurePanel } from 'react-msaview-structure/panel'

import alignments from './structureAlignments.json'
import {
  fitSummary,
  mappedTargets,
  messageOf,
  tmSummary,
  useAccessionMappings,
} from './structureDemo'
import useWidthSetter from './useWidthSetter'

import type { SuperposeRowsResult } from 'react-msaview-structure'
import type { TmAlignment } from 'react-msaview-structure/panel'

const { globins } = alignments
const landmark = globins.landmarks

const track = 'ca-distance'

type Fit =
  | { kind: 'alignment' | 'pocket'; result: SuperposeRowsResult }
  | { kind: 'tm-align'; fits?: Record<string, TmAlignment> }

// Five human globins, from the oxygen carriers to the tissue globins, share a
// fold and share almost no sequence. The page asks AlphaFold DB for each
// model, lays them on one another by the alignment's own correspondences, and
// reads where they part company. The two orange columns are the heme's
// histidines, which every one of them holds in the same place.
const GlobinSuperposition = observer(function GlobinSuperposition() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 340,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: { msa: globins.msa },
      highlights: [
        {
          start: landmark['distal His (E7)'].column,
          end: landmark['distal His (E7)'].column,
          label: 'distal His',
          color: '#e41a1c',
        },
        {
          start: landmark['proximal His (F8)'].column,
          end: landmark['proximal His (F8)'].column,
          label: 'proximal His',
          color: '#ff7f00',
        },
      ],
    }),
  )
  const ref = useWidthSetter(model)
  const [fit, setFit] = useState<Fit>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const mappings = useAccessionMappings(model, globins.proteins, {
    onReady: () => {
      void run('alignment')
    },
  })

  const rows = globins.proteins.map(p => p.row)
  const targets = mappedTargets(model, rows)

  async function run(kind: 'alignment' | 'pocket' | 'tm-align') {
    setError(undefined)
    if (kind === 'tm-align') {
      model.setSelection(undefined)
      model.setColumnTracks(model.columnTracks.filter(t => t.id !== track))
      setFit({ kind })
      return
    }
    setBusy(true)
    try {
      const pocket = {
        start: landmark['E helix start'].column,
        end: landmark['F helix end'].column,
      }
      model.setSelection(kind === 'pocket' ? pocket : undefined)
      const result = await superposeRows({
        model,
        targets: mappedTargets(model, rows),
        selection: kind === 'pocket' ? pocket : undefined,
      })
      model.setColumnTracks([
        ...model.columnTracks.filter(t => t.id !== track),
        distanceTrack(result, track),
      ])
      setFit({ kind, result })
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setBusy(false)
    }
  }

  const structureIds = targets.map(t => t.structureId)
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
      >
        <Button
          size="small"
          variant={fit?.kind === 'alignment' ? 'contained' : 'outlined'}
          disabled={busy || mappings.state !== 'ready'}
          onClick={() => {
            void run('alignment')
          }}
        >
          Fit the whole fold by the alignment
        </Button>
        <Button
          size="small"
          variant={fit?.kind === 'pocket' ? 'contained' : 'outlined'}
          disabled={busy || mappings.state !== 'ready'}
          onClick={() => {
            void run('pocket')
          }}
        >
          Fit the E and F helices only
        </Button>
        <Button
          size="small"
          variant={fit?.kind === 'tm-align' ? 'contained' : 'outlined'}
          disabled={busy || mappings.state !== 'ready'}
          onClick={() => {
            void run('tm-align')
          }}
        >
          Fit by structure (TM-align)
        </Button>
      </Stack>
      {mappings.state === 'loading' ? (
        <Typography variant="body2">{mappings.message}…</Typography>
      ) : null}
      {mappings.state === 'error' ? (
        <Alert severity="warning">{mappings.message}</Alert>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {fit && fit.kind !== 'tm-align' ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          {fitSummary(fit.result)}
        </Alert>
      ) : null}
      {fit?.kind === 'tm-align' ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          {tmSummary(fit.fits)}
        </Alert>
      ) : null}
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
        <div ref={ref}>
          <MSAView model={model} />
        </div>
        {structureIds.length > 0 ? (
          <StructurePanel
            model={model}
            structureIds={structureIds}
            transforms={
              fit && fit.kind !== 'tm-align' ? fit.result.matrices : undefined
            }
            fitBy={fit?.kind === 'tm-align' ? 'tm-align' : 'transforms'}
            onTmAlign={fits => {
              setFit(prev =>
                prev?.kind === 'tm-align' ? { ...prev, fits } : prev,
              )
            }}
            height={420}
          />
        ) : null}
      </Box>
    </Box>
  )
})

export default GlobinSuperposition
