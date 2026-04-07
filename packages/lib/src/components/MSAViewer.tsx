import React, { useEffect, useMemo } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import useMeasure from '@jbrowse/core/util/useMeasure'
import { ThemeProvider } from '@mui/material/styles'

import MSAModelF from '../model.ts'

import Loading from './Loading.tsx'

import type { FileLocation as FileLocationType } from '@jbrowse/core/util/types'

interface MSAViewerProps {
  msa?: string
  tree?: string
  msaFilehandle?: FileLocationType
  treeFilehandle?: FileLocationType
  colorScheme?: string
  height?: number
}

export default function MSAViewer({
  msa,
  tree,
  msaFilehandle,
  treeFilehandle,
  colorScheme,
  height,
}: MSAViewerProps) {
  const theme = useMemo(() => createJBrowseTheme(), [])
  const model = useMemo(
    () =>
      MSAModelF().create({
        type: 'MsaView',
        ...(msa || tree ? { data: { msa: msa ?? '', tree: tree ?? '' } } : {}),
        ...(msaFilehandle ? { msaFilehandle } : {}),
        ...(treeFilehandle ? { treeFilehandle } : {}),
        ...(colorScheme ? { colorSchemeName: colorScheme } : {}),
        ...(height ? { height } : {}),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [ref, { width }] = useMeasure()
  useEffect(() => {
    if (width) {
      requestAnimationFrame(() => {
        model.setWidth(width)
      })
    }
  }, [model, width])

  return (
    <ThemeProvider theme={theme}>
      <div ref={ref}>
        <Loading model={model} />
      </div>
    </ThemeProvider>
  )
}
