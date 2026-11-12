import { useState } from 'react'

import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'
import { facetsByRowField } from 'react-msaview-structure'
import { FacetGrid } from 'react-msaview-structure/panel'

import alignments from './structureAlignments.json'
import {
  ChoiceButtons,
  FitSummary,
  MappingStatus,
  StructureColorSelect,
  isSelected,
  useAccessionMappings,
  useSelectionFit,
} from './structureDemo'
import useWidthSetter from './useWidthSetter'

import type {
  PolymerRepresentation,
  StructureColor,
} from 'react-msaview-structure/panel'

const { kinases } = alignments
const { landmarks } = kinases
const rows = kinases.proteins.map(p => p.row)

const marks = [
  { name: 'Gly-rich loop (GxGxxG)', color: '#e41a1c' },
  { name: 'catalytic Lys', color: '#ff7f00' },
  { name: 'HRD motif', color: '#ff00aa' },
  { name: 'DFG motif', color: '#ffd400' },
] as const

const groupColors = {
  CMGC: '#0072b2',
  AGC: '#009e73',
  CAMK: '#7a5195',
  Other: '#6c757d',
}

// columns of CDK2's N-lobe, residues 4-85, and C-lobe, 86-286, which meet at
// the hinge, E81-L83
const lobes = [
  { name: 'N-lobe', start: 1, end: 94 },
  { name: 'C-lobe', start: 95, end: 310 },
]

// Eight human kinases from four of the kinome's groups, one panel per group.
// A facet on the group field stacks the alignment's rows in the same four
// bands, labelled in the order the panels take.
// The alignment decides which residues sit on which, so all eight structures
// lie in one frame and the four panels turn together: whatever differs
// between groups differs in place. The four colored marks are the motifs every
// protein kinase carries, on the alignment and on each structure.
//
// A kinase domain is two lobes on a hinge, and the lobes move against each
// other as a kinase switches on and off. A fit on one lobe holds that lobe
// still, and the CA distance track shows where the rest of the domain departs
// from it; in these AlphaFold models the activation loop departs most. The fit
// follows the selection: pick a lobe, or drag along the Position ruler to fit
// any range of columns.
const KinaseFacets = observer(function KinaseFacets() {
  const [model] = useState(() => {
    const created = MSAModelF().create({
      type: 'MsaView',
      height: 400,
      residueColor: { scale: { scheme: 'clustalx_protein_dynamic' } },
      data: { msa: kinases.msa },
      rowTransform: {
        facet: { field: 'group', sort: Object.keys(groupColors) },
      },
      highlights: marks.map(({ name, color }) => ({
        start: landmarks[name].column,
        end: landmarks[name].column,
        label: name.replace(/ \(.*\)/, ''),
        color,
      })),
    })
    created.setRowData(
      Object.fromEntries(
        kinases.proteins.map(({ row, group }) => [row, { group }]),
      ),
    )
    return created
  })
  const ref = useWidthSetter(model)
  const [colorBy, setColorBy] = useState<StructureColor>('none')
  const [representation, setRepresentation] = useState<PolymerRepresentation>()
  const mappings = useAccessionMappings(model, kinases.proteins)
  const ready = mappings.state === 'ready'
  const fit = useSelectionFit(model, rows, { enabled: ready })
  const facets = ready ? facetsByRowField(model, 'group', groupColors) : []
  return (
    <Box>
      <ChoiceButtons
        disabled={!ready}
        choices={[
          {
            label: 'Fit every column',
            active: isSelected(model),
            choose: () => {
              model.setSelection(undefined)
            },
          },
          ...lobes.map(({ name, start, end }) => ({
            label: `Fit the ${name}`,
            active: isSelected(model, { start, end }),
            choose: () => {
              model.setSelection({ start, end })
            },
          })),
        ]}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          or drag along the Position ruler
        </Typography>
      </ChoiceButtons>
      <Stack direction="row" spacing={2} sx={{ mb: 1, alignItems: 'center' }}>
        <StructureColorSelect
          label="Color the structures by"
          noneLabel="Kinase group"
          value={colorBy}
          onChange={setColorBy}
        />
        <Typography variant="body2">as</Typography>
        <Select
          size="small"
          value={representation ?? 'cartoon'}
          onChange={e => {
            setRepresentation(e.target.value)
          }}
        >
          <MenuItem value="cartoon">Cartoon</MenuItem>
          <MenuItem value="surface">Surface</MenuItem>
        </Select>
      </Stack>
      <MappingStatus mappings={mappings} />
      <FitSummary fit={fit} />
      <div ref={ref} style={{ marginBottom: 12 }}>
        <MSAView model={model} />
      </div>
      {facets.length > 0 ? (
        <FacetGrid
          model={model}
          facets={facets}
          transforms={fit.result?.matrices}
          columns={4}
          cellHeight={260}
          colorBy={colorBy}
          representation={representation}
        />
      ) : null}
    </Box>
  )
})

export default KinaseFacets
