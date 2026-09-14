import React, { useEffect, useRef, useState } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import useMeasure from '@jbrowse/core/util/useMeasure'
import { destroy, isAlive } from '@jbrowse/mobx-state-tree'
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
  /**
   * hide columns at least this percent gaps (default 100, i.e. hide nothing)
   */
  allowedGappyness?: number
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
  allowedGappyness,
  highlightColumns,
  highlights,
  relativeTo,
  columnTracks,
  residueMappings,
  drawTree,
  treeAreaWidth,
  autoTreeAreaWidth,
}: MSAViewerProps) {
  // useState, not useMemo: the MST instance must be created exactly once
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
      ...(allowedGappyness !== undefined ? { allowedGappyness } : {}),
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

  const destroyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  const [ref, { width }] = useMeasure()
  useEffect(() => {
    if (width) {
      model.setWidth(width)
    }
  }, [model, width])

  // These props stay live after mount, so a host control can drive the model
  // without a remount. Each effect depends only on its own prop, so a change
  // made inside the viewer survives the host's next render. A new msa, tree or
  // gff needs a new model: change the component's `key`.
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
    if (allowedGappyness !== undefined) {
      model.setAllowedGappyness(allowedGappyness)
    }
  }, [model, allowedGappyness])
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
  // unguarded, so removing the prop turns the reference diff off
  useEffect(() => {
    model.drawRelativeTo(relativeTo)
  }, [model, relativeTo])

  // keyed by content, since a host computing a layer inline passes a new array
  // on every render
  const highlightsKey = JSON.stringify(highlights ?? [])
  useEffect(() => {
    model.setHighlights(JSON.parse(highlightsKey))
  }, [model, highlightsKey])
  const columnTracksKey = JSON.stringify(columnTracks ?? [])
  useEffect(() => {
    model.setColumnTracks(JSON.parse(columnTracksKey))
  }, [model, columnTracksKey])
  const residueMappingsKey = JSON.stringify(residueMappings ?? [])
  useEffect(() => {
    model.setResidueMappings(JSON.parse(residueMappingsKey))
  }, [model, residueMappingsKey])
  const highlightColumnsKey = JSON.stringify(highlightColumns ?? null)
  useEffect(() => {
    model.setHighlightedColumns(JSON.parse(highlightColumnsKey) ?? undefined)
  }, [model, highlightColumnsKey])

  // destroy releases the model's matchMedia listener and fetches. It waits a
  // tick because StrictMode remounts with the same state, and the remount's
  // effect cancels it.
  useEffect(() => {
    if (destroyTimer.current !== undefined) {
      clearTimeout(destroyTimer.current)
      destroyTimer.current = undefined
    }
    return () => {
      destroyTimer.current = setTimeout(() => {
        destroyTimer.current = undefined
        if (isAlive(model)) {
          destroy(model)
        }
      })
    }
  }, [model])

  return (
    <ThemeProvider theme={theme}>
      <div ref={ref}>
        <Loading model={model} />
      </div>
    </ThemeProvider>
  )
}
