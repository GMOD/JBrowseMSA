import React from 'react'

import { ErrorMessage } from '@jbrowse/core/ui'
import { ErrorBoundary } from '@jbrowse/core/ui/ErrorBoundary'
import { Button, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import MSAView from './MSAView'
import ImportForm from './import/ImportForm'

import type { MsaViewModel } from '../model'

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 20 }}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>
          {`@keyframes spinner { to { transform: rotate(360deg); } }`}
        </style>
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#ccc"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="#1976d2"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          style={{ animation: 'spinner 1s linear infinite', transformOrigin: 'center' }}
        />
      </svg>
      <Typography variant="h6">Loading...</Typography>
    </div>
  )
}

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
            <LoadingSpinner />
          ) : (
            <MSAView model={model} />
          )
        ) : hasPendingFilehandle || isLoading ? (
          <LoadingSpinner />
        ) : (
          <ImportForm model={model} />
        )}
      </ErrorBoundary>
    </div>
  )
})

export default Loading
