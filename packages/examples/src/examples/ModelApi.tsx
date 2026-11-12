import { useState } from 'react'

import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'

import { proteinMSA, proteinTree } from './data'
import useWidthSetter from './useWidthSetter'

import type { MsaViewModel } from 'react-msaview'

const colorSchemes = [
  'maeditor',
  'clustal',
  'clustalx_protein',
  'clustalx_protein_dynamic',
  'percent_identity_dynamic',
  'blosum62_dynamic',
  'lesk',
  'cinema',
  'flower',
  'jalview_taylor',
  'jalview_zappo',
  'jalview_hydrophobicity',
  'jalview_buried',
  'none',
]

function treeSwitches(model: MsaViewModel) {
  return [
    {
      label: 'Branch lengths',
      checked: model.showBranchLen,
      set: (on: boolean) => {
        model.setShowBranchLen(on)
      },
    },
    {
      label: 'Align labels right',
      checked: model.labelsAlignRight,
      set: (on: boolean) => {
        model.setLabelsAlignRight(on)
      },
    },
    {
      label: 'Node bubbles',
      checked: model.drawNodeBubbles,
      set: (on: boolean) => {
        model.setDrawNodeBubbles(on)
      },
    },
    {
      label: 'Show tree',
      checked: model.drawTree,
      set: (on: boolean) => {
        model.setDrawTree(on)
      },
    },
  ]
}

// MSAModelF creates the model MSAViewer would create internally, and MSAView
// renders it. The page holds the model, so it reads any property and calls any
// action: every control below is a model action, and the observer wrapper
// re-renders the controls when the model changes. MSAView does not measure
// itself, so useWidthSetter pushes the container's width into the model.
const ModelApi = observer(function ModelApi() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 500,
      colWidth: 16,
      rowHeight: 20,
      residueColor: { scale: { scheme: 'maeditor' } },
      data: { msa: proteinMSA, tree: proteinTree },
    }),
  )
  const ref = useWidthSetter(model)
  const actions = [
    {
      label: 'Wider columns',
      run: () => {
        model.setColWidth(model.colWidth + 2)
      },
    },
    {
      label: 'Narrower columns',
      run: () => {
        model.setColWidth(Math.max(1, model.colWidth - 2))
      },
    },
    {
      label: 'Taller rows',
      run: () => {
        model.setRowHeight(model.rowHeight + 2)
      },
    },
    {
      label: 'Fit to view',
      run: () => {
        model.fit()
      },
    },
  ]
  return (
    <div>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
      >
        {actions.map(({ label, run }) => (
          <Button key={label} variant="outlined" size="small" onClick={run}>
            {label}
          </Button>
        ))}
        <TextField
          select
          size="small"
          label="Color scheme"
          value={model.resolvedResidueColor.scheme}
          onChange={event => {
            model.setResidueColor({
              ...model.residueColor,
              scale: { scheme: event.target.value },
            })
          }}
          sx={{ minWidth: 200 }}
        >
          {colorSchemes.map(name => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mb: 1, flexWrap: 'wrap' }}>
        {treeSwitches(model).map(({ label, checked, set }) => (
          <FormControlLabel
            key={label}
            label={label}
            control={
              <Switch
                checked={checked}
                onChange={event => {
                  set(event.target.checked)
                }}
              />
            }
          />
        ))}
      </Stack>
      <div ref={ref}>
        <MSAView model={model} />
      </div>
    </div>
  )
})

export default ModelApi
