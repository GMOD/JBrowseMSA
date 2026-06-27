import React, { useEffect, useState } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import useMeasure from '@jbrowse/core/util/useMeasure'
import { ThemeProvider } from '@mui/material/styles'

import MSAModelF from '../model.ts'
import Loading from './Loading.tsx'

import type { FileLocation as FileLocationType } from '@jbrowse/core/util/types'

const theme = createJBrowseTheme()

interface MSAViewerProps {
  msa?: string
  tree?: string
  gff?: string
  msaFilehandle?: FileLocationType
  treeFilehandle?: FileLocationType
  gffFilehandle?: FileLocationType
  colorScheme?: string
  height?: number
  /** initial per-column pixel width (zoom level) */
  colWidth?: number
  /** initial per-row pixel height */
  rowHeight?: number
  /** alignment columns (0-based) to highlight with a persistent overlay */
  highlightColumns?: number[]
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
  colWidth,
  rowHeight,
  highlightColumns,
  relativeTo,
}: MSAViewerProps) {
  // lazy initializer: the model is created exactly once from the initial props
  // (a stable MST instance — not a value safe to recompute, so not useMemo)
  const [model] = useState(() =>
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
      ...(colWidth ? { colWidth } : {}),
      ...(rowHeight ? { rowHeight } : {}),
      ...(highlightColumns ? { highlightColumns } : {}),
      ...(relativeTo ? { relativeTo } : {}),
    }),
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
