import { useState } from 'react'

import Box from '@mui/material/Box'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'
import { StructurePanel } from 'react-msaview-structure/panel'

import {
  ChoiceButtons,
  FitSummary,
  MappingStatus,
  isSelected,
  mappedTargets,
  useAccessionMappings,
  useSelectionFit,
} from './structureDemo'
import useWidthSetter from './useWidthSetter'

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
      selection: core,
      highlights: [
        { ...nmp, label: 'NMP lid', color: 'rgba(0,114,178,0.35)' },
        { ...lid, label: 'LID', color: 'rgba(204,121,167,0.35)' },
      ],
    }),
  )
  const ref = useWidthSetter(model)
  const mappings = useAccessionMappings(model, proteins)
  const ready = mappings.state === 'ready'
  const [everyPair, setEveryPair] = useState(false)
  const fit = useSelectionFit(model, rows, {
    enabled: ready,
    refine: everyPair ? false : undefined,
  })

  function fitOn(range: typeof core | undefined, countEveryPair: boolean) {
    setEveryPair(countEveryPair)
    model.setSelection(range)
  }

  const structureIds = mappedTargets(model, rows).map(t => t.structureId)
  return (
    <Box>
      <ChoiceButtons
        disabled={!ready}
        choices={[
          {
            label: `Fit the core, residues ${core.start}–${core.end}`,
            active: isSelected(model, core),
            choose: () => {
              fitOn(core, false)
            },
          },
          {
            label: 'Fit the whole chain, outliers set aside',
            active: isSelected(model) && !everyPair,
            choose: () => {
              fitOn(undefined, false)
            },
          },
          {
            label: 'Fit the whole chain, every pair counted',
            active: isSelected(model) && everyPair,
            choose: () => {
              fitOn(undefined, true)
            },
          },
        ]}
      />
      <MappingStatus mappings={mappings} />
      <FitSummary fit={fit} />
      <div ref={ref} style={{ marginBottom: 12 }}>
        <MSAView model={model} />
      </div>
      {structureIds.length > 1 ? (
        <StructurePanel
          model={model}
          structureIds={structureIds}
          transforms={fit.result?.matrices}
          height={440}
        />
      ) : null}
    </Box>
  )
})

export default AdenylateKinaseHinge
