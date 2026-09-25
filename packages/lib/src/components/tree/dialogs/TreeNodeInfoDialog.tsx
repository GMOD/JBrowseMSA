import React from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { DialogContent, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import MetadataTable from '../../MetadataTable.tsx'
import SequenceTextArea from '../../SequenceTextArea.tsx'

import type { MsaViewModel } from '../../../model.ts'

const TreeNodeInfoDialog = observer(function ({
  info,
  model,
  nodeName,
  onClose,
}: {
  info: Record<string, unknown>
  model: MsaViewModel
  nodeName: string
  onClose: () => void
}) {
  const { rows } = model
  const metadata = model.rowDataOf(nodeName)
  const res = rows.find(f => f[0] === nodeName)
  return (
    <Dialog
      onClose={() => {
        onClose()
      }}
      open
      title="Tree node info"
      maxWidth="xl"
    >
      <DialogContent>
        <Typography variant="h6">Attributes</Typography>
        <MetadataTable record={{ nodeName, ...info }} />
        <Typography variant="h6">Sequence</Typography>
        {res ? (
          <SequenceTextArea str={[res]} />
        ) : (
          <Typography>Sequence not found</Typography>
        )}
        {metadata ? (
          <>
            <Typography variant="h6">Extra metadata</Typography>
            <MetadataTable record={metadata} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
})

export default TreeNodeInfoDialog
