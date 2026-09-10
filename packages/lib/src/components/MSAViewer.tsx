import React, { useEffect, useState } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import useMeasure from '@jbrowse/core/util/useMeasure'
import { ThemeProvider } from '@mui/material/styles'

import MSAModelF from '../model.ts'
import Loading from './Loading.tsx'

import type { ColumnTrackSpec, Highlight, ResidueMapping } from '../types.ts'
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
  /**
   * labeled highlights in 1-based inclusive coordinates: `{start, end}` for
   * alignment columns, `{row, start, end}` for residues of that row, `{rows}`
   * for whole rows, each with an optional `label` and `color`
   */
  highlights?: Highlight[]
  /** row name to diff every other row against (matches render as ".") */
  relativeTo?: string
  /** tracks supplied as data: per-column bar values or a text row (see docs/layers.md) */
  columnTracks?: ColumnTrackSpec[]
  /** which residue of which structure each row's residues are (see docs/layers.md) */
  residueMappings?: ResidueMapping[]
  /** draw the phylogenetic tree (default true); false leaves a labels-only gutter */
  drawTree?: boolean
  /** fixed width (px) of the tree/label area */
  treeAreaWidth?: number
  /** auto-size the tree/label area to the labels (used when drawTree is false) */
  autoTreeAreaWidth?: boolean
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
  highlights,
  relativeTo,
  columnTracks,
  residueMappings,
  drawTree,
  treeAreaWidth,
  autoTreeAreaWidth,
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
      ...(highlights ? { highlights } : {}),
      ...(relativeTo ? { relativeTo } : {}),
      ...(columnTracks ? { columnTracks } : {}),
      ...(residueMappings ? { residueMappings } : {}),
      ...(drawTree !== undefined ? { drawTree } : {}),
      ...(treeAreaWidth ? { treeAreaWidth } : {}),
      ...(autoTreeAreaWidth ? { autoTreeAreaWidth } : {}),
    }),
  )

  const [ref, { width }] = useMeasure()
  useEffect(() => {
    if (width) {
      model.setWidth(width)
    }
  }, [model, width])

  // The props below stay live after mount: change one and it drives the model,
  // so a host can put a control on the viewer -- an expand button, a diff
  // toggle, a color-scheme picker -- without remounting it and re-fetching its
  // alignment. Each effect depends only on its own prop, so a change the user
  // makes inside the viewer (picking a scheme from the menu, dragging a row
  // taller) survives the host's next render rather than being snapped back.
  // Data props are not among them: new msa/tree/gff is a different alignment,
  // which is a new model, which React spells `key`.
  useEffect(() => {
    if (height !== undefined) {
      model.setHeight(height)
    }
  }, [model, height])
  useEffect(() => {
    if (colorScheme !== undefined) {
      model.setColorSchemeName(colorScheme)
    }
  }, [model, colorScheme])
  useEffect(() => {
    if (colWidth !== undefined) {
      model.setColWidth(colWidth)
    }
  }, [model, colWidth])
  useEffect(() => {
    if (rowHeight !== undefined) {
      model.setRowHeight(rowHeight)
    }
  }, [model, rowHeight])
  useEffect(() => {
    if (drawTree !== undefined) {
      model.setDrawTree(drawTree)
    }
  }, [model, drawTree])
  useEffect(() => {
    if (treeAreaWidth !== undefined) {
      model.setTreeAreaWidth(treeAreaWidth)
    }
  }, [model, treeAreaWidth])
  // unguarded: dropping the prop is how a host turns the reference diff back off
  useEffect(() => {
    model.drawRelativeTo(relativeTo)
  }, [model, relativeTo])

  return (
    <ThemeProvider theme={theme}>
      <div ref={ref}>
        <Loading model={model} />
      </div>
    </ThemeProvider>
  )
}
