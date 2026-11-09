import { useState } from 'react'

import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'
import { StructurePanel } from 'react-msaview-structure/panel'

import alignments from './structureAlignments.json'
import {
  MappingStatus,
  SideBySide,
  hemeHistidines,
  useAccessionMappings,
} from './structureDemo'
import useWidthSetter from './useWidthSetter'

import type { StructureColor } from 'react-msaview-structure/panel'

const { globins } = alignments
const entry = '4HHB'

const proteins = globins.proteins
  .filter(p => p.row === 'HBA_HUMAN' || p.row === 'HBB_HUMAN')
  .map(({ row, accession }) => ({ row, accession, pdbId: entry }))

// Deoxyhemoglobin is two alpha and two beta chains in one crystal, 4HHB. The
// alpha row maps onto chain A and the beta row onto chain B, so one structure
// carries two rows, and a hovered cell lights the residue on its own row's
// chain. The heme histidines are column highlights, so they mark both chains
// at once. The myoglobin and tissue globin rows stay unmapped: the alignment
// still places them, and the structure has nothing of theirs to show.
const HemoglobinChains = observer(function HemoglobinChains() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 260,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: { msa: globins.msa },
      highlights: hemeHistidines,
    }),
  )
  const ref = useWidthSetter(model)
  const mappings = useAccessionMappings(model, proteins)
  const [colorBy, setColorBy] = useState<StructureColor>('none')
  const chains = model.mappedStructures.filter(m => m.structure.id === entry)
  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 1, alignItems: 'center' }}>
        <Typography variant="body2">Color the chains by</Typography>
        <Select
          size="small"
          value={colorBy}
          onChange={e => {
            setColorBy(e.target.value)
          }}
        >
          <MenuItem value="none">Row</MenuItem>
          <MenuItem value="conservation">Column conservation</MenuItem>
          <MenuItem value="scheme">Alignment colors</MenuItem>
        </Select>
        {chains.length > 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {chains
              .map(m => `${m.row} → ${entry} chain ${m.structure.asymId}`)
              .join(' · ')}
          </Typography>
        ) : null}
      </Stack>
      <MappingStatus mappings={mappings} />
      <SideBySide>
        <div ref={ref}>
          <MSAView model={model} />
        </div>
        {chains.length > 0 ? (
          <StructurePanel
            model={model}
            structureId={entry}
            colorBy={colorBy}
            height={420}
          />
        ) : null}
      </SideBySide>
    </Box>
  )
})

export default HemoglobinChains
