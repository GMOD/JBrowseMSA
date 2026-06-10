import { useState } from 'react'

import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'
import useWidthSetter from './useWidthSetter'

// The tree panel has several display toggles, each backed by a model action.
// Flipping them mutates the model and the observer re-renders the canvas.
const TreeOptions = observer(function () {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 500,
      data: { msa: proteinMSA, tree: proteinTree },
    }),
  )
  const ref = useWidthSetter(model)
  return (
    <div>
      <Stack direction="row" spacing={2} sx={{ mb: 1, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={model.showBranchLen}
              onChange={event => {
                model.setShowBranchLen(event.target.checked)
              }}
            />
          }
          label="Branch lengths"
        />
        <FormControlLabel
          control={
            <Switch
              checked={model.labelsAlignRight}
              onChange={event => {
                model.setLabelsAlignRight(event.target.checked)
              }}
            />
          }
          label="Align labels right"
        />
        <FormControlLabel
          control={
            <Switch
              checked={model.drawNodeBubbles}
              onChange={event => {
                model.setDrawNodeBubbles(event.target.checked)
              }}
            />
          }
          label="Node bubbles"
        />
        <FormControlLabel
          control={
            <Switch
              checked={model.drawTree}
              onChange={event => {
                model.setDrawTree(event.target.checked)
              }}
            />
          }
          label="Show tree"
        />
      </Stack>
      <div ref={ref}>
        <MSAView model={model} />
      </div>
    </div>
  )
})

export default TreeOptions
