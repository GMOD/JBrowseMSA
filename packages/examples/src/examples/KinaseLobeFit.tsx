import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { reaction } from 'mobx'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'
import { distanceTrack, superposeRows } from 'react-msaview-structure'
import { StructurePanel } from 'react-msaview-structure/panel'

import alignments from './structureAlignments.json'
import {
  fitSummary,
  mappedTargets,
  messageOf,
  useAccessionMappings,
} from './structureDemo'
import useWidthSetter from './useWidthSetter'

import type { MsaViewModel } from 'react-msaview'
import type { SuperposeRowsResult } from 'react-msaview-structure'

const { kinases } = alignments
const picked = ['CDK2_HUMAN', 'MK01_HUMAN', 'KAPCA_HUMAN', 'AURKA_HUMAN']
const proteins = kinases.proteins.filter(p => picked.includes(p.row))
const track = 'ca-distance'

// columns of CDK2's N-lobe, residues 4-85, and C-lobe, 86-286, which meet at
// the hinge, E81-L83
const lobes = {
  'N-lobe': { start: 1, end: 94 },
  'C-lobe': { start: 95, end: 310 },
}

type Fit =
  | { state: 'idle' }
  | { state: 'fitting'; label: string }
  | { state: 'done'; label: string; result: SuperposeRowsResult }
  | { state: 'error'; message: string }

function rangeLabel(model: MsaViewModel) {
  const { selection } = model
  return selection
    ? `columns ${selection.start}-${selection.end}`
    : 'every column'
}

// A kinase domain is two lobes on a hinge, and the lobes move against each
// other as a kinase switches on and off. A fit on one lobe holds that lobe
// still, and the CA distance track shows where the rest of the domain departs
// from it; in these AlphaFold models the activation loop stands out most. The
// fit follows the selection: pick a lobe, or drag along the Position ruler to
// fit any range of columns.
const KinaseLobeFit = observer(function KinaseLobeFit() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 260,
      colWidth: 3,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: kinases.msa
          .split('>')
          .filter(block => picked.some(row => block.startsWith(row)))
          .map(block => `>${block}`)
          .join(''),
      },
      selection: lobes['N-lobe'],
    }),
  )
  const ref = useWidthSetter(model)
  const mappings = useAccessionMappings(model, proteins)
  const [fit, setFit] = useState<Fit>({ state: 'idle' })
  const ready = mappings.state === 'ready'

  useEffect(() => {
    if (!ready) {
      return
    }
    let latest = 0
    return reaction(
      () => [model.selection?.start, model.selection?.end] as const,
      async ([start, end]) => {
        const run = ++latest
        const label = rangeLabel(model)
        setFit({ state: 'fitting', label })
        try {
          const targets = mappedTargets(model, picked)
          const result = await superposeRows({
            model,
            targets,
            selection:
              start === undefined || end === undefined
                ? undefined
                : { start, end },
          })
          if (run !== latest) {
            return
          }
          model.setColumnTracks([distanceTrack(result, track)])
          setFit({ state: 'done', label, result })
        } catch (e) {
          if (run === latest) {
            setFit({ state: 'error', message: messageOf(e) })
          }
        }
      },
      { fireImmediately: true, delay: 300 },
    )
  }, [ready, model])

  const structureIds = mappedTargets(model, picked).map(t => t.structureId)
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
      >
        {Object.entries(lobes).map(([name, range]) => (
          <Button
            key={name}
            size="small"
            variant={
              model.selection?.start === range.start &&
              model.selection.end === range.end
                ? 'contained'
                : 'outlined'
            }
            onClick={() => {
              model.setSelection(range)
            }}
          >
            Fit the {name}
          </Button>
        ))}
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          or drag along the Position ruler
        </Typography>
      </Stack>
      {mappings.state === 'loading' ? (
        <Typography variant="body2">{mappings.message}…</Typography>
      ) : null}
      {mappings.state === 'error' ? (
        <Alert severity="warning">{mappings.message}</Alert>
      ) : null}
      {fit.state === 'error' ? (
        <Alert severity="error">{fit.message}</Alert>
      ) : null}
      {fit.state === 'fitting' ? (
        <Typography variant="body2">Fitting {fit.label}…</Typography>
      ) : null}
      {fit.state === 'done' ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          Fitted on {fit.label}: {fitSummary(fit.result)}
        </Alert>
      ) : null}
      <div ref={ref} style={{ marginBottom: 12 }}>
        <MSAView model={model} />
      </div>
      {structureIds.length > 1 ? (
        <StructurePanel
          model={model}
          structureIds={structureIds}
          transforms={fit.state === 'done' ? fit.result.matrices : undefined}
          height={440}
        />
      ) : null}
    </Box>
  )
})

export default KinaseLobeFit
