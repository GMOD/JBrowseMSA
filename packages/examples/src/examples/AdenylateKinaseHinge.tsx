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

import {
  fitSummary,
  mappedTargets,
  messageOf,
  useAccessionMappings,
} from './structureDemo'
import useWidthSetter from './useWidthSetter'

import type { SuperposeRowsResult } from 'react-msaview-structure'

// UniProt P69441, E. coli adenylate kinase
const sequence =
  'MRIILLGAPGAGKGTQAQFIMEKYGIPQISTGDMLRAAVKSGSELGKQAKDIMDAGKLVT' +
  'DELVIALVKERIAQEDCRNGFLLDGFPRTIPQADAMKEAGINVDYVLEFDVPDELIVDRI' +
  'VGRRVHAPSGRVYHVKFNPPKVEGKDDVTGEELTTRKDDQEETVRKRLVEYHQMTAPLIG' +
  'YYSKEAEAGNTKYAKVDGTKPVAEVRADLEKILG'

const open = 'open_4AKE'
const closed = 'closed_1AKE'
const proteins = [
  { row: open, accession: 'P69441', pdbId: '4AKE' },
  { row: closed, accession: 'P69441', pdbId: '1AKE' },
]
const rows = proteins.map(p => p.row)

const nmp = { start: 30, end: 59 }
const lid = { start: 122, end: 159 }
const core = { start: 60, end: 121 }

const track = 'ca-distance'

type FitKind = 'every-pair' | 'refined' | 'core'

// One enzyme, crystallized twice: empty (4AKE) and closed on the
// two-substrate inhibitor Ap5A (1AKE). The rows are the same sequence, so
// every column pairs a residue with itself. A fit that counts every pair
// spreads the motion of the two lids over the rigid core. The default fit sets
// aside the pairs more than twice the RMSD off and fits again, which finds the
// core unprompted, and a fit on the core columns alone holds it still by
// construction. Either way the lids are left to show how far they swing.
const AdenylateKinaseHinge = observer(function AdenylateKinaseHinge() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 220,
      colWidth: 5,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: { msa: `>${open}\n${sequence}\n>${closed}\n${sequence}\n` },
      turnedOffTracks: { conservation: true, 'property-conservation': true },
      highlights: [
        { ...nmp, label: 'NMP lid', color: 'rgba(0,114,178,0.35)' },
        { ...lid, label: 'LID', color: 'rgba(204,121,167,0.35)' },
      ],
    }),
  )
  const ref = useWidthSetter(model)
  const [fit, setFit] = useState<{
    kind: FitKind
    result: SuperposeRowsResult
  }>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const mappings = useAccessionMappings(model, proteins, {
    onReady: () => {
      void run('core')
    },
  })

  async function run(kind: FitKind) {
    setError(undefined)
    setBusy(true)
    try {
      const targets = mappedTargets(model, rows)
      model.setSelection(kind === 'core' ? core : undefined)
      const result = await superposeRows({
        model,
        targets,
        selection: kind === 'core' ? core : undefined,
        refine: kind === 'every-pair' ? false : undefined,
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

  const structureIds = mappedTargets(model, rows).map(t => t.structureId)
  const ready = mappings.state === 'ready'
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
      >
        <Button
          size="small"
          variant={fit?.kind === 'core' ? 'contained' : 'outlined'}
          disabled={busy || !ready}
          onClick={() => {
            void run('core')
          }}
        >
          Fit the core, residues {core.start}–{core.end}
        </Button>
        <Button
          size="small"
          variant={fit?.kind === 'refined' ? 'contained' : 'outlined'}
          disabled={busy || !ready}
          onClick={() => {
            void run('refined')
          }}
        >
          Fit the whole chain, outliers set aside
        </Button>
        <Button
          size="small"
          variant={fit?.kind === 'every-pair' ? 'contained' : 'outlined'}
          disabled={busy || !ready}
          onClick={() => {
            void run('every-pair')
          }}
        >
          Fit the whole chain, every pair counted
        </Button>
      </Stack>
      {mappings.state === 'loading' ? (
        <Typography variant="body2">{mappings.message}…</Typography>
      ) : null}
      {mappings.state === 'error' ? (
        <Alert severity="warning">{mappings.message}</Alert>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {fit ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          {fitSummary(fit.result)}
        </Alert>
      ) : null}
      <div ref={ref} style={{ marginBottom: 12 }}>
        <MSAView model={model} />
      </div>
      {structureIds.length > 1 ? (
        <StructurePanel
          model={model}
          structureIds={structureIds}
          transforms={fit?.result.matrices}
          height={440}
        />
      ) : null}
    </Box>
  )
})

export default AdenylateKinaseHinge
