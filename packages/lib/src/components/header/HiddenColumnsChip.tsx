import React, { lazy } from 'react'

import { Chip, Tooltip } from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const GapThresholdDialog = lazy(
  () => import('../dialogs/GapThresholdDialog.tsx'),
)

const HiddenColumnsChip = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  const n = model.gappyColumns.length
  return n > 0 ? (
    <Tooltip
      title={`Hiding columns with ≥${model.allowedGappyness}% gaps. Click to change the threshold, × to show every column`}
    >
      <Chip
        data-testid="hidden_columns_chip"
        size="small"
        variant="outlined"
        label={`${n.toLocaleString('en-US')} gappy column${n === 1 ? '' : 's'} hidden`}
        style={{ margin: 'auto 8px', flexShrink: 0 }}
        onClick={() => {
          model.queueDialog(onClose => [GapThresholdDialog, { model, onClose }])
        }}
        onDelete={() => {
          model.setHideGaps(false)
        }}
      />
    </Tooltip>
  ) : null
})

export default HiddenColumnsChip
