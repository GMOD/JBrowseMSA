import React, { useState } from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { Tab, Tabs } from '@mui/material'

import InterProScanPanel from './InterProScanDialog.tsx'
import UserProvidedResultPanel from './UserProvidedDomainsDialog.tsx'

import type { MsaViewModel } from '../../model.ts'

export default function LaunchDomainViewDialog({
  handleClose,
  model,
}: {
  handleClose: () => void
  model: MsaViewModel
}) {
  const [choice, setChoice] = useState(0)
  return (
    <Dialog
      maxWidth="xl"
      title="Launch protein view"
      onClose={() => {
        handleClose()
      }}
      open
    >
      <Tabs
        value={choice}
        onChange={(_, val) => {
          setChoice(val)
        }}
      >
        <Tab value={0} label="Automatic lookup" />
        <Tab value={1} label="Manual" />
      </Tabs>
      {choice === 0 ? (
        <InterProScanPanel model={model} handleClose={handleClose} />
      ) : null}
      {choice === 1 ? (
        <UserProvidedResultPanel model={model} handleClose={handleClose} />
      ) : null}
    </Dialog>
  )
}
