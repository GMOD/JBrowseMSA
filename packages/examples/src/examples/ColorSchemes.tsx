import { useState } from 'react'

import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'
import useWidthSetter from './useWidthSetter'

const colorSchemes = [
  'maeditor',
  'clustal',
  'clustalx_protein',
  'clustalx_protein_dynamic',
  'percent_identity_dynamic',
  'lesk',
  'cinema',
  'flower',
  'jalview_taylor',
  'jalview_zappo',
  'jalview_hydrophobicity',
  'jalview_buried',
  'none',
]

// Color schemes can be changed at runtime via model.setColorSchemeName. The
// view re-renders reactively because the component is wrapped in observer.
const ColorSchemes = observer(function () {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 500,
      colorSchemeName: 'maeditor',
      data: { msa: proteinMSA, tree: proteinTree },
    }),
  )
  const ref = useWidthSetter(model)
  return (
    <div>
      <Select
        value={model.colorSchemeName}
        size="small"
        onChange={event => {
          model.setColorSchemeName(event.target.value)
        }}
        sx={{ mb: 1 }}
      >
        {colorSchemes.map(name => (
          <MenuItem key={name} value={name}>
            {name}
          </MenuItem>
        ))}
      </Select>
      <div ref={ref}>
        <MSAView model={model} />
      </div>
    </div>
  )
})

export default ColorSchemes
