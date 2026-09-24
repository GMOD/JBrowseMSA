import React from 'react'

import { ErrorMessage } from '@jbrowse/core/ui'
import { ErrorBoundary } from '@jbrowse/core/ui/ErrorBoundary'
import { Button, CircularProgress, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import MSAView from './MSAView.tsx'
import ImportForm from './import/ImportForm.tsx'

import type { MsaViewModel } from '../model.ts'

const LoadingSpinner = observer(function ({ model }: { model: MsaViewModel }) {
  const { status } = model
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 20 }}
    >
      <CircularProgress size={24} />
      <Typography variant="h6">{status?.msg ?? 'Loading...'}</Typography>
      {status?.onCancel ? (
        <Button
          variant="outlined"
          size="small"
          onClick={() => status.onCancel?.()}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  )
})

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
  const {
    isLoading,
    dataInitialized,
    data,
    error,
    resetCount,
    msaFilehandle,
    treeFilehandle,
  } = model
  const hasData = !!(data.msa || data.tree)
  // a failed load keeps its filehandle, so the error outranks the spinner
  const loading = !error && !!(msaFilehandle || treeFilehandle || isLoading)

  return (
    <div>
      {/* keyed on the reset counter: the boundary holds the error it caught
          until it is remounted, so without this "Return to import form" put
          the model back and left the error screen up */}
      <ErrorBoundary
        key={resetCount}
        FallbackComponent={e => <Reset model={model} error={e.error} />}
      >
        {dataInitialized ? (
          isLoading ? (
            <LoadingSpinner model={model} />
          ) : (
            <MSAView model={model} />
          )
        ) : hasData ? (
          <Reset model={model} error={error} />
        ) : (
          <>
            {loading ? <LoadingSpinner model={model} /> : null}
            <div style={{ display: loading ? 'none' : undefined }}>
              <ImportForm model={model} />
            </div>
          </>
        )}
      </ErrorBoundary>
    </div>
  )
})

export default Loading
