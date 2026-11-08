import React from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { DialogContent, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import MetadataTable, { isEmpty, isRecord } from '../MetadataTable.tsx'
import SequenceTextArea from '../SequenceTextArea.tsx'
import { gfLabels, monospaceKeys, sectionLabels } from './metadataLabels.ts'
import { groupGeneral } from './metadataRecord.tsx'

import type { MsaViewModel } from '../../model.ts'

const MetadataDialog = observer(function ({
  model,
  onClose,
}: {
  model: MsaViewModel
  onClose: () => void
}) {
  const entries = Object.entries(model.header).filter(
    ([, value]) => value != null && !isEmpty(value),
  )
  const fields = Object.fromEntries(
    entries.filter(([, value]) => !isRecord(value)),
  )
  const sections = entries.filter(
    (entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]),
  )
  return (
    <Dialog
      onClose={() => {
        onClose()
      }}
      open
      title="Metadata"
      maxWidth="xl"
    >
      <DialogContent>
        {entries.length === 0 ? (
          <Typography>This alignment has no metadata.</Typography>
        ) : (
          <>
            {Object.keys(fields).length > 0 ? (
              <MetadataTable record={fields} />
            ) : null}
            {sections.map(([section, value]) => (
              <div key={section}>
                <Typography variant="h6">
                  {sectionLabels[section] ?? section}
                </Typography>
                {section === 'General' ? (
                  <MetadataTable
                    record={groupGeneral(value)}
                    labels={gfLabels}
                    monospaceKeys={monospaceKeys}
                  />
                ) : (
                  <MetadataTable record={value} />
                )}
              </div>
            ))}
          </>
        )}
        <Typography variant="h6">Sequences</Typography>
        <SequenceTextArea str={model.rows} />
      </DialogContent>
    </Dialog>
  )
})

export default MetadataDialog
