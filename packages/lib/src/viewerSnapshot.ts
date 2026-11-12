import { createJBrowseTheme } from '@jbrowse/core/ui/theme'

import { normalizedResidueColor } from './residueColor.ts'

import type { MSAViewerProps } from './components/MSAViewer.tsx'
import type { Highlight } from './types.ts'

/**
 * The `highlightColumns` prop as `highlights`: one `{start, end}` per run of
 * adjacent 1-based alignment columns
 */
export function columnHighlights(columns: number[] = []) {
  const sorted = [...new Set(columns)].toSorted((a, b) => a - b)
  const runs: { start: number; end: number }[] = []
  for (const column of sorted) {
    const last = runs.at(-1)
    if (last?.end === column - 1) {
      last.end = column
    } else {
      runs.push({ start: column, end: column })
    }
  }
  return runs
}

export function viewerHighlights({
  highlights = [],
  highlightColumns,
}: Pick<MSAViewerProps, 'highlights' | 'highlightColumns'>): Highlight[] {
  return [...highlights, ...columnHighlights(highlightColumns)]
}

function urlLocation(uri: string | undefined) {
  return uri ? { uri, locationType: 'UriLocation' as const } : undefined
}

/** each filehandle prop, or the URL prop standing in for it */
export function fileLocations({
  msaFilehandle,
  treeFilehandle,
  gffFilehandle,
  msaUrl,
  treeUrl,
  gffUrl,
}: MSAViewerProps) {
  return {
    msaFilehandle: msaFilehandle ?? urlLocation(msaUrl),
    treeFilehandle: treeFilehandle ?? urlLocation(treeUrl),
    gffFilehandle: gffFilehandle ?? urlLocation(gffUrl),
  }
}

export function resolveTheme(theme: MSAViewerProps['theme']) {
  return createJBrowseTheme(
    theme === 'dark'
      ? { palette: { mode: 'dark' } }
      : typeof theme === 'object'
        ? theme
        : undefined,
  )
}

/**
 * The model snapshot `MSAViewer` creates from its props. The CLI's `--props`
 * reads the same JSON the R and Python widgets send, so a figure exported
 * headlessly draws what the widget drew.
 */
export function viewerSnapshot(props: MSAViewerProps) {
  const {
    msa,
    tree,
    gff,
    rowData,
    residueColor,
    height,
    colWidth,
    rowHeight,
    allowedGappyness,
    highlightColumns,
    highlights,
    features,
    selection,
    trimToSelection,
    clades,
    relativeTo,
    columnTracks,
    residueMappings,
    encodings,
    rowPanels,
    rowTransform,
    drawTree,
    treeAreaWidth,
    showBranchLen,
    treeOrder,
    treeRoot,
    region,
  } = props
  const { msaFilehandle, treeFilehandle, gffFilehandle } = fileLocations(props)
  return {
    type: 'MsaView' as const,
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
    ...(residueColor
      ? { residueColor: normalizedResidueColor(residueColor) }
      : {}),
    ...(height ? { height } : {}),
    ...(colWidth ? { colWidth } : {}),
    ...(rowHeight ? { rowHeight } : {}),
    ...(allowedGappyness !== undefined ? { allowedGappyness } : {}),
    ...(highlights || highlightColumns
      ? { highlights: viewerHighlights({ highlights, highlightColumns }) }
      : {}),
    ...(features ? { features } : {}),
    ...(selection ? { selection } : {}),
    ...(trimToSelection !== undefined ? { trimToSelection } : {}),
    ...(clades ? { clades } : {}),
    ...(relativeTo ? { relativeTo } : {}),
    ...(columnTracks ? { columnTracks } : {}),
    ...(residueMappings ? { residueMappings } : {}),
    ...(encodings ? { encodings } : {}),
    ...(rowPanels ? { rowPanels } : {}),
    ...(rowTransform ? { rowTransform } : {}),
    ...(drawTree !== undefined ? { drawTree } : {}),
    ...(treeAreaWidth ? { treeAreaWidth } : {}),
    ...(showBranchLen !== undefined ? { showBranchLen } : {}),
    ...(treeOrder ? { treeOrder } : {}),
    ...(treeRoot ? { treeRoot } : {}),
    ...(region ? { region } : {}),
  }
}
