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
  gff?: string
  msaFilehandle?: FileLocationType
  treeFilehandle?: FileLocationType
  gffFilehandle?: FileLocationType
  colorScheme?: string
  height?: number
  /** row name to diff every other row against (matches render as ".") */
  relativeTo?: string
}

export default function MSAViewer({
  msa,
  tree,
  gff,
  msaFilehandle,
  treeFilehandle,
  gffFilehandle,
  colorScheme,
  height,
  relativeTo,
}: MSAViewerProps) {
  const theme = useMemo(() => createJBrowseTheme(), [])
  const model = useMemo(
    () =>
      MSAModelF().create({
        type: 'MsaView',
        ...(msa || tree || gff
          ? { data: { msa: msa ?? '', tree: tree ?? '', gff } }
          : {}),
        ...(msaFilehandle ? { msaFilehandle } : {}),
        ...(treeFilehandle ? { treeFilehandle } : {}),
        ...(gffFilehandle ? { gffFilehandle } : {}),
        ...(colorScheme ? { colorSchemeName: colorScheme } : {}),
        ...(height ? { height } : {}),
        ...(relativeTo ? { relativeTo } : {}),
      }),
    // eslint-disable-next-line @eslint-react/exhaustive-deps
    [],
  )

  const [ref, { width }] = useMeasure()
  useEffect(() => {
    if (width) {
      model.setWidth(width)
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
