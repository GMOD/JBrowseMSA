import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'
import { StructurePanel } from 'react-msaview-structure/panel'

import alignments from './structureAlignments.json'
import {
  ChoiceButtons,
  FitSummary,
  MappingStatus,
  SideBySide,
  hemeHistidines,
  isSelected,
  mappedTargets,
  tmSummary,
  useAccessionMappings,
  useSelectionFit,
} from './structureDemo'
import useWidthSetter from './useWidthSetter'

import type { TmAlignment } from 'react-msaview-structure/panel'

const { globins } = alignments
const rows = globins.proteins.map(p => p.row)
const helices = {
  start: globins.landmarks['E helix start'].column,
  end: globins.landmarks['F helix end'].column,
}

// Five human globins, from the oxygen carriers to the tissue globins, share a
// fold and share almost no sequence. The page asks AlphaFold DB for each
// model, lays them on one another by the alignment's own correspondences, and
// reads where they part company. The two orange columns are the heme's
// histidines, which every one of them holds in the same place. The fit follows
// the selection, so a drag along the Position ruler fits any range of columns.
const GlobinSuperposition = observer(function GlobinSuperposition() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 340,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: { msa: globins.msa },
      highlights: hemeHistidines,
    }),
  )
  const ref = useWidthSetter(model)
  const mappings = useAccessionMappings(model, globins.proteins)
  const ready = mappings.state === 'ready'
  const [tmAlign, setTmAlign] = useState(false)
  const [tmFits, setTmFits] = useState<Record<string, TmAlignment>>()
  const fit = useSelectionFit(model, rows, { enabled: ready && !tmAlign })

  function fitColumns(range?: { start: number; end: number }) {
    setTmAlign(false)
    model.setSelection(range)
  }

  const structureIds = mappedTargets(model, rows).map(t => t.structureId)
  return (
    <Box>
      <ChoiceButtons
        disabled={!ready}
        choices={[
          {
            label: 'Fit the whole fold by the alignment',
            active: !tmAlign && isSelected(model),
            choose: () => {
              fitColumns(undefined)
            },
          },
          {
            label: 'Fit the E and F helices only',
            active: !tmAlign && isSelected(model, helices),
            choose: () => {
              fitColumns(helices)
            },
          },
          {
            label: 'Fit by structure (TM-align)',
            active: tmAlign,
            choose: () => {
              model.setSelection(undefined)
              setTmFits(undefined)
              setTmAlign(true)
            },
          },
        ]}
      />
      <MappingStatus mappings={mappings} />
      {tmAlign ? (
        <Alert severity="info" sx={{ mb: 1 }}>
          {tmSummary(tmFits)}
        </Alert>
      ) : (
        <FitSummary fit={fit} />
      )}
      <SideBySide>
        <div ref={ref}>
          <MSAView model={model} />
        </div>
        {structureIds.length > 0 ? (
          <StructurePanel
            model={model}
            structureIds={structureIds}
            transforms={fit.result?.matrices}
            fitBy={tmAlign ? 'tm-align' : 'transforms'}
            onTmAlign={setTmFits}
            height={420}
          />
        ) : null}
      </SideBySide>
    </Box>
  )
})

export default GlobinSuperposition
