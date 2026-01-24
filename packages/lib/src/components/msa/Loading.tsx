import React from 'react'

import { CircularProgress, Typography } from '@mui/material'
export default function Loading() {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
      }}
    >
      <CircularProgress />
      <Typography>Loading...</Typography>
    </div>
  )
}
