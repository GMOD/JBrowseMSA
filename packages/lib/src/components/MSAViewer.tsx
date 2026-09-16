import React, { useEffect, useRef, useState } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import useMeasure from '@jbrowse/core/util/useMeasure'
import { destroy, isAlive } from '@jbrowse/mobx-state-tree'
import { ThemeProvider } from '@mui/material/styles'
import { compareStructural, reaction, when } from 'mobx'

import MSAModelF from '../model.ts'
import Loading from './Loading.tsx'

import type { MsaViewModel } from '../model.ts'
import type {
  Cell,
  Clade,
  ColumnTrackSpec,
  Encoding,
  Highlight,
  Region,
  ResidueEncoding,
  ResidueMapping,
  Viewport,
} from '../types.ts'
import type { FileLocation as FileLocationType } from '@jbrowse/core/util/types'
import type { ThemeOptions } from '@mui/material/styles'

function resolveTheme(theme: MSAViewerProps['theme']) {
  return createJBrowseTheme(
    theme === 'dark'
      ? { palette: { mode: 'dark' } }
      : typeof theme === 'object'
        ? theme
        : undefined,
  )
}

export interface MSAViewerProps {
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
  /**
   * clades of the tree with a mark drawn over them: `{mrca, tips, mark}` or
   * `{range, tips, mark}`, with `mark: 'highlight'` filling the rows behind
   * the clade (see docs/layers.md)
   */
  clades?: Clade[]
  /** row name to diff every other row against (matches render as ".") */
  relativeTo?: string
  /** tracks supplied as data: per-column bar values or a text row (see docs/layers.md) */
  columnTracks?: ColumnTrackSpec[]
  /** which residue of which structure each row's residues are (see docs/layers.md) */
  residueMappings?: ResidueMapping[]
  /** extra fields per row name, such as a lineage or a host (see docs/layers.md) */
  rowData?: Record<string, Record<string, string>>
  /**
   * what the viewer's marks read from a table: `{channel, field, scale?}`,
   * where `channel` is `tipLabel`, `rowTint` or `branch` over `rowData`, or
   * `featureFill` or `featureLabel` over the annotations (see docs/layers.md)
   */
  encodings?: Encoding[]
  /** draw the phylogenetic tree (default true); false leaves a labels-only gutter */
  drawTree?: boolean
  /** fixed width (px) of the tree/label area */
  treeAreaWidth?: number
  /** auto-size the tree/label area to the labels (used when drawTree is false) */
  autoTreeAreaWidth?: boolean
  /** draw branch lengths (default true); false draws a cladogram */
  showBranchLen?: boolean
  /**
   * which channel `colorScheme` paints: `fill` (default) colors the background
   * of the cell a residue sits in, `color` colors the letter itself and leaves
   * the background plain, which lets a domain overlay mark each span with a bar
   * under the row and the residue colors show through
   */
  residueEncoding?: ResidueEncoding
  /**
   * a span to zoom and scroll to once the alignment loads, and again whenever
   * it changes: `{row, start, end}` in residues of that row, or `{start, end}`
   * in columns, 1-based and inclusive
   */
  region?: Region
  /** leave out the toolbar, for a page drawing its own controls */
  hideHeader?: boolean
  /**
   * 'light' (default), 'dark', or MUI theme options (palette, typography)
   * merged over the JBrowse theme
   */
  theme?: 'light' | 'dark' | ThemeOptions
  /** the cell under the pointer, or undefined when it leaves the alignment */
  onCellHover?: (cell: Cell | undefined) => void
  /** the cell a click pinned, or undefined when a click clears it */
  onCellClick?: (cell: Cell | undefined) => void
  /** the alignment columns on screen, after every scroll, zoom and resize */
  onViewportChange?: (viewport: Viewport | undefined) => void
  /**
   * the model the viewer built, for the model API; called again with the new
   * model when msa, tree, gff or a filehandle changes
   */
  onModel?: (model: MsaViewModel) => void
}

type DataSource = Pick<
  MSAViewerProps,
  'msa' | 'tree' | 'gff' | 'msaFilehandle' | 'treeFilehandle' | 'gffFilehandle'
>

function sameSource(a: DataSource, b: DataSource) {
  return (
    a.msa === b.msa &&
    a.tree === b.tree &&
    a.gff === b.gff &&
    JSON.stringify([a.msaFilehandle, a.treeFilehandle, a.gffFilehandle]) ===
      JSON.stringify([b.msaFilehandle, b.treeFilehandle, b.gffFilehandle])
  )
}

/**
 * A new alignment, tree or annotation file needs a new model, so the viewer
 * remounts when one of those props changes and keeps its model across every
 * other change.
 */
export default function MSAViewer(props: MSAViewerProps) {
  const { msa, tree, gff, msaFilehandle, treeFilehandle, gffFilehandle } = props
  const source = {
    msa,
    tree,
    gff,
    msaFilehandle,
    treeFilehandle,
    gffFilehandle,
  }
  const [shown, setShown] = useState({ source, generation: 0 })
  if (!sameSource(shown.source, source)) {
    setShown({ source, generation: shown.generation + 1 })
  }
  return <Viewer key={shown.generation} {...props} />
}

function useModelReaction<K extends 'hoveredCell' | 'clickedCell' | 'viewport'>(
  model: MsaViewModel,
  key: K,
  handler: ((value: MsaViewModel[K]) => void) | undefined,
) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  const listening = !!handler
  useEffect(
    () =>
      listening
        ? reaction(
            () => model[key],
            value => {
              latest.current?.(value)
            },
            { equals: compareStructural },
          )
        : undefined,
    [model, key, listening],
  )
}

function Viewer({
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
  clades,
  relativeTo,
  columnTracks,
  residueMappings,
  rowData,
  encodings,
  drawTree,
  residueEncoding,
  treeAreaWidth,
  autoTreeAreaWidth,
  showBranchLen,
  region,
  hideHeader,
  theme,
  onCellHover,
  onCellClick,
  onViewportChange,
  onModel,
}: MSAViewerProps) {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      ...(msa || tree || gff || rowData
        ? {
            data: {
              msa: msa ?? '',
              tree: tree ?? '',
              gff,
              // the row table is stored as this JSON string, which is what a
              // shared URL and the size limit already cover
              ...(rowData ? { treeMetadata: JSON.stringify(rowData) } : {}),
            },
          }
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
      ...(clades ? { clades } : {}),
      ...(relativeTo ? { relativeTo } : {}),
      ...(columnTracks ? { columnTracks } : {}),
      ...(residueMappings ? { residueMappings } : {}),
      ...(encodings ? { encodings } : {}),
      ...(drawTree !== undefined ? { drawTree } : {}),
      ...(treeAreaWidth ? { treeAreaWidth } : {}),
      ...(autoTreeAreaWidth ? { autoTreeAreaWidth } : {}),
      ...(showBranchLen !== undefined ? { showBranchLen } : {}),
      ...(residueEncoding !== undefined
        ? { bgColor: residueEncoding === 'fill' }
        : {}),
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

  // Each effect depends only on its own prop, so a change made inside the
  // viewer survives the host's next render.
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
  useEffect(() => {
    if (showBranchLen !== undefined) {
      model.setShowBranchLen(showBranchLen)
    }
  }, [model, showBranchLen])
  useEffect(() => {
    if (residueEncoding !== undefined) {
      model.setBgColor(residueEncoding === 'fill')
    }
  }, [model, residueEncoding])
  useEffect(() => {
    model.setHideHeader(!!hideHeader)
  }, [model, hideHeader])
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
  const cladesKey = JSON.stringify(clades ?? [])
  useEffect(() => {
    model.setClades(JSON.parse(cladesKey))
  }, [model, cladesKey])
  const columnTracksKey = JSON.stringify(columnTracks ?? [])
  useEffect(() => {
    model.setColumnTracks(JSON.parse(columnTracksKey))
  }, [model, columnTracksKey])
  const residueMappingsKey = JSON.stringify(residueMappings ?? [])
  useEffect(() => {
    model.setResidueMappings(JSON.parse(residueMappingsKey))
  }, [model, residueMappingsKey])
  const rowDataKey = JSON.stringify(rowData ?? {})
  useEffect(() => {
    const table = JSON.parse(rowDataKey)
    // an empty table leaves whatever the snapshot or a filehandle loaded
    if (Object.keys(table).length) {
      model.setRowData(table)
    }
  }, [model, rowDataKey])
  const encodingsKey = JSON.stringify(encodings ?? [])
  useEffect(() => {
    model.setEncodings(JSON.parse(encodingsKey))
  }, [model, encodingsKey])
  const highlightColumnsKey = JSON.stringify(highlightColumns ?? null)
  useEffect(() => {
    model.setHighlightedColumns(JSON.parse(highlightColumnsKey) ?? undefined)
  }, [model, highlightColumnsKey])

  const regionKey = JSON.stringify(region ?? null)
  useEffect(() => {
    const target = JSON.parse(regionKey) as Region | null
    return target
      ? when(
          () => model.viewInitialized && model.numColumns > 0,
          () => {
            model.zoomToRegion(target)
          },
        )
      : undefined
  }, [model, regionKey])

  useModelReaction(model, 'hoveredCell', onCellHover)
  useModelReaction(model, 'clickedCell', onCellClick)
  useModelReaction(model, 'viewport', onViewportChange)

  const latestOnModel = useRef(onModel)
  useEffect(() => {
    latestOnModel.current = onModel
  })
  useEffect(() => {
    latestOnModel.current?.(model)
  }, [model])

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
    <ThemeProvider theme={resolveTheme(theme)}>
      <div ref={ref}>
        <Loading model={model} />
      </div>
    </ThemeProvider>
  )
}
