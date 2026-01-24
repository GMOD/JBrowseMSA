import React from 'react'

import Attributes from '@jbrowse/core/BaseFeatureWidget/BaseFeatureDetail/Attributes'
import BaseCard from '@jbrowse/core/BaseFeatureWidget/BaseFeatureDetail/BaseCard'
import { Dialog } from '@jbrowse/core/ui'
import { DialogContent } from '@mui/material'
import { observer } from 'mobx-react'

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
  const { treeMetadata, rows } = model
  const metadata = treeMetadata[nodeName]
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
        <BaseCard title="Attributes">
          <Attributes attributes={{ nodeName, ...info }} />
        </BaseCard>
        <BaseCard title="Sequence">
          {res ? (
            <SequenceTextArea str={[res]} />
          ) : (
            <div>Sequence not found</div>
          )}
        </BaseCard>
        {metadata ? (
          <BaseCard title="Extra metadata">
            <Attributes attributes={metadata} />
          </BaseCard>
        ) : null}
      </DialogContent>
    </Dialog>
  )
})

export default TreeNodeInfoDialog
