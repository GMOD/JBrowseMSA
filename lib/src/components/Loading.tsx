import React from 'react'

import { ErrorMessage } from '@jbrowse/core/ui'
import { ErrorBoundary } from '@jbrowse/core/ui/ErrorBoundary'
import { Button, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import MSAView from './MSAView'
import ImportForm from './import/ImportForm'

import type { MsaViewModel } from '../model'

const Reset = observer(function ({
  model,
  error,
}: {
  model: MsaViewModel
  error: unknown
}) {
  return (
    <div>
      <ErrorMessage error={error} />
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          model.reset()
        }}
      >
        Return to import form
      </Button>
    </div>
  )
})

const Loading = observer(function ({ model }: { model: MsaViewModel }) {
  const { isLoading, dataInitialized, msaFilehandle, treeFilehandle } = model
  const hasPendingFilehandle = !!(msaFilehandle || treeFilehandle)

  return (
    <div>
      <ErrorBoundary
        FallbackComponent={e => <Reset model={model} error={e.error} />}
      >
        {dataInitialized ? (
          isLoading ? (
            <Typography variant="h4">Loading...</Typography>
          ) : (
            <MSAView model={model} />
          )
        ) : hasPendingFilehandle || isLoading ? (
          <Typography variant="h4">Loading...</Typography>
        ) : (
          <ImportForm model={model} />
        )}
      </ErrorBoundary>
    </div>
  )
})

export default Loading
