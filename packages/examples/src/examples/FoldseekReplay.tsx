import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { when } from 'mobx'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'
import { foldseekCandidates } from 'react-msaview-structure'
import { StructurePanel } from 'react-msaview-structure/panel'

import recorded from './foldseekMyoglobin.json'
import alignments from './structureAlignments.json'
import {
  SideBySide,
  hemeHistidines,
  messageOf,
  structureKey,
} from './structureDemo'
import useWidthSetter from './useWidthSetter'

import type { StructureCandidate } from 'react-msaview-structure'

const { globins } = alignments
const row = 'sample_7'

type Found =
  | { state: 'mapping' }
  | { state: 'done'; candidates: StructureCandidate[] }
  | { state: 'error'; message: string }

// The myoglobin row, renamed to what a lab notebook would call it, has no
// database id to look a structure up by. Foldseek finds structures by
// sequence instead: its 3Di predictor turns the sequence into a structural
// alphabet and searches AlphaFold DB and the PDB with it. The search waits on
// a public queue, so this page replays one recorded by
// scripts/examples-gen/foldseekHits.mjs. Mapping the hits still runs here: an
// AlphaFold hit opens from its model file, and a PDB hit opens from the RCSB
// assembly file Foldseek searched, numbered by the chain whose CA atoms are
// the hit's own trace.
const FoldseekReplay = observer(function FoldseekReplay() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 260,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: { msa: globins.msa.replace('>MYG_HUMAN', `>${row}`) },
      highlights: hemeHistidines,
    }),
  )
  const ref = useWidthSetter(model)
  const [found, setFound] = useState<Found>({ state: 'mapping' })

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    void (async () => {
      try {
        await when(() => model.dataInitialized, { signal })
        const candidates = await foldseekCandidates({
          rowName: row,
          rowSequence: model.rowSequence(row) ?? '',
          hits: recorded.hits,
          fetchText: async url => {
            const res = await fetch(url, { signal })
            if (!res.ok) {
              throw new Error(`${url}: HTTP ${res.status}`)
            }
            return res.text()
          },
        })
        if (signal.aborted) {
          return
        }
        const first =
          candidates.find(c => c.kind === 'experimental') ?? candidates[0]
        if (first) {
          model.setResidueMappings([first.mapping])
        }
        setFound({ state: 'done', candidates })
      } catch (e) {
        if (!signal.aborted) {
          setFound({ state: 'error', message: messageOf(e) })
        }
      }
    })()
    return () => {
      controller.abort()
    }
  }, [model])

  const shown = model.mappedStructures[0]?.structure
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Foldseek hits for {row}, searched {recorded.searched}
      </Typography>
      {found.state === 'mapping' ? (
        <Typography variant="body2">Mapping the hits…</Typography>
      ) : null}
      {found.state === 'error' ? (
        <Alert severity="error">{found.message}</Alert>
      ) : null}
      {found.state === 'done' ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
        >
          {found.candidates.map(({ mapping, label, identity }) => (
            <Button
              key={structureKey(mapping.structure)}
              size="small"
              variant={
                shown && structureKey(mapping.structure) === structureKey(shown)
                  ? 'contained'
                  : 'outlined'
              }
              title={identity}
              onClick={() => {
                model.setResidueMappings([mapping])
              }}
            >
              {label}
            </Button>
          ))}
        </Stack>
      ) : null}
      <SideBySide>
        <div ref={ref}>
          <MSAView model={model} />
        </div>
        {shown ? (
          <StructurePanel model={model} structureId={shown.id} height={420} />
        ) : null}
      </SideBySide>
    </Box>
  )
})

export default FoldseekReplay
