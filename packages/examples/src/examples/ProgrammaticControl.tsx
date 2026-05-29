import { useState } from 'react'

import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'
import useWidthSetter from './useWidthSetter'

// The model exposes actions for programmatic control. Because MSAView is an
// observer, any action that mutates the model triggers a re-render.
const ProgrammaticControl = observer(function () {
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
      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            model.setColWidth(model.colWidth + 2)
          }}
        >
          Wider columns
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            model.setColWidth(Math.max(1, model.colWidth - 2))
          }}
        >
          Narrower columns
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            model.setRowHeight(model.rowHeight + 2)
          }}
        >
          Taller rows
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            model.fit()
          }}
        >
          Fit to view
        </Button>
      </Stack>
      <div ref={ref}>
        <MSAView model={model} />
      </div>
    </div>
  )
})

export default ProgrammaticControl
