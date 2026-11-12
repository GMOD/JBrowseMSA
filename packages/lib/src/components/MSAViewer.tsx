import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import useMeasure from '@jbrowse/core/util/useMeasure'
import { destroy, isAlive } from '@jbrowse/mobx-state-tree'
import { ThemeProvider } from '@mui/material/styles'
import { compareStructural, reaction, when } from 'mobx'

import MSAModelF from '../model.ts'
import { letterColors } from '../scales.ts'
import {
  fileLocations,
  resolveTheme,
  viewerHighlights,
  viewerSnapshot,
} from '../viewerSnapshot.ts'
import Loading from './Loading.tsx'

import type { MsaViewModel } from '../model.ts'
import type {
  Cell,
  Clade,
  ColorScheme,
  ColumnTrackSpec,
  Encoding,
  Feature,
  Highlight,
  MsaSelection,
  Region,
  ResidueEncoding,
  ResidueMapping,
  RowDataInput,
  RowPanelSpec,
  RowTransform,
  TreeOrder,
  TreeRoot,
  Viewport,
} from '../types.ts'
import type { FileLocation as FileLocationType } from '@jbrowse/core/util/types'
import type { ThemeOptions } from '@mui/material/styles'
import type { ForwardedRef } from 'react'

export interface MSAViewerProps {
  msa?: string
  tree?: string
  gff?: string
  msaFilehandle?: FileLocationType
  treeFilehandle?: FileLocationType
  gffFilehandle?: FileLocationType
  /** a URL the viewer fetches the alignment from; `msaFilehandle` wins */
  msaUrl?: string
  /** a URL the viewer fetches the Newick tree from; `treeFilehandle` wins */
  treeUrl?: string
  /** a URL the viewer fetches the GFF from; `gffFilehandle` wins */
  gffUrl?: string
  /**
   * a scheme name from the built-in table, or `{domain, range}`, a color per
   * residue letter that leaves every other letter uncolored. The earlier
   * `{map}` still reads
   */
  colorScheme?: ColorScheme
  height?: number
  /** initial per-column pixel width (zoom level) */
  colWidth?: number
  /** initial per-row pixel height */
  rowHeight?: number
  /**
   * hide columns at least this percent gaps (default 100, i.e. hide nothing)
   */
  allowedGappyness?: number
  /**
   * alignment columns, 1-based like `highlights`, drawn as one `{start, end}`
   * highlight per run of adjacent columns
   */
  highlightColumns?: number[]
  /**
   * labeled highlights in 1-based inclusive coordinates: `{start, end}` for
   * alignment columns, `{row, start, end}` for residues of that row, `{rows}`
   * for whole rows, each with an optional `label` and `color`
   */
  highlights?: Highlight[]
  /**
   * features on the rows as data, drawn with the GFF's: `{row, start, end}` in
   * residues of that row, 1-based and inclusive, with an optional `name`,
   * `description`, `type`, `strand` and `color`, and any other field an
   * encoding reads (see docs/layers.md)
   */
  features?: Feature[]
  /**
   * clades of the tree with a mark drawn over them: `{mrca, tips, mark}` or
   * `{range, tips, mark}`, where `mark` is `highlight`, `bracket`, `collapse`,
   * `focus` or `rotate` (see docs/layers.md)
   */
  clades?: Clade[]
  /** row name to diff every other row against (matches render as ".") */
  relativeTo?: string
  /**
   * tracks supplied as data: per-column bar values, a text row, or arcs
   * joining pairs of columns (see docs/layers.md)
   */
  columnTracks?: ColumnTrackSpec[]
  /** which residue of which structure each row's residues are (see docs/layers.md) */
  residueMappings?: ResidueMapping[]
  /** extra fields per row name, such as a lineage or a host (see docs/layers.md) */
  rowData?: RowDataInput
  /**
   * what the viewer's marks read from a table:
   * `{channel, field, scale?, legend?}`, where `channel` is
   * `tipLabel`, `rowTint` or `branch` over `rowData`, `featureFill` over
   * the annotations, or `nodePoint` over the tree's support values, and
   * `{channel: 'featureLabel' | 'rowLabel', field}` (see docs/layers.md)
   */
  encodings?: Encoding[]
  /**
   * panels between the tree and the alignment:
   * `{kind: 'strip', encoding: {fill: {field, scale?, legend?}}}`
   * fills one cell per row from a `rowData` field, and
   * `{kind: 'features', x, encoding?: {fill?, text?}}` draws the annotation
   * spans per row (see docs/layers.md)
   */
  rowPanels?: RowPanelSpec[]
  /**
   * the row axis's transforms over `rowData`: `filter` keeps the rows passing
   * `[{field, oneOf}]` or `[{field, range}]`, `sort` orders them by
   * `[{field, order}]` where there is no tree, and `facet: {field, sort?}`
   * bands them under a label per value (see docs/layers.md)
   */
  rowTransform?: RowTransform
  /** draw the phylogenetic tree (default true); false leaves a labels-only gutter */
  drawTree?: boolean
  /** fixed width (px) of the tree/label area; unset fits it to the labels and the tree */
  treeAreaWidth?: number
  /** draw branch lengths (default true); false draws a cladogram */
  showBranchLen?: boolean
  /**
   * the order each node's children draw in: `branchLength` (default,
   * shortest first), `input` (as the file gives them), `ladderize` (fewest
   * tips first) or `ladderizeReverse` (most tips first)
   */
  treeOrder?: TreeOrder
  /**
   * reroot the tree: `midpoint`, or `{outgroup: [tip names]}` on the branch
   * above those tips' common ancestor
   */
  treeRoot?: TreeRoot
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
  /**
   * the selected block: `{start, end}` columns of the file, 1-based and
   * inclusive, and `rows` by name, every row where absent
   */
  selection?: MsaSelection
  /** hide every column outside `selection` (default false) */
  trimToSelection?: boolean
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
   * the selected block, after each change a drag, the header menu, Escape or
   * the `selection` prop makes, or undefined when it clears
   */
  onSelectionChange?: (selection: MsaSelection | undefined) => void
  /**
   * the model the viewer built, for the model API; called again with the new
   * model when msa, tree, msaUrl, treeUrl, msaFilehandle or treeFilehandle
   * changes
   */
  onModel?: (model: MsaViewModel) => void
}

type DataSource = Pick<
  MSAViewerProps,
  'msa' | 'tree' | 'msaFilehandle' | 'treeFilehandle'
>

function sameSource(a: DataSource, b: DataSource) {
  return (
    a.msa === b.msa &&
    a.tree === b.tree &&
    JSON.stringify([a.msaFilehandle, a.treeFilehandle]) ===
      JSON.stringify([b.msaFilehandle, b.treeFilehandle])
  )
}

/**
 * A new alignment or tree needs a new model, so the viewer remounts when one
 * of those props changes and keeps its model across every other change,
 * including a new annotation file. A `ref` holds the current model.
 */
const MSAViewer = forwardRef<MsaViewModel, MSAViewerProps>(
  function MSAViewer(props, ref) {
    const resolved = { ...props, ...fileLocations(props) }
    const { msa, tree, msaFilehandle, treeFilehandle } = resolved
    const source = { msa, tree, msaFilehandle, treeFilehandle }
    const [shown, setShown] = useState({ source, generation: 0 })
    if (!sameSource(shown.source, source)) {
      setShown({ source, generation: shown.generation + 1 })
    }
    return <Viewer key={shown.generation} modelRef={ref} {...resolved} />
  },
)

export default MSAViewer

function useModelReaction<
  K extends 'hoveredCell' | 'clickedCell' | 'viewport' | 'selection',
>(
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

function isRegion(value: unknown): value is Region {
  return (
    typeof value === 'object' &&
    value !== null &&
    'start' in value &&
    typeof value.start === 'number' &&
    'end' in value &&
    typeof value.end === 'number' &&
    (!('row' in value) ||
      value.row === undefined ||
      typeof value.row === 'string')
  )
}

interface SyncedProp {
  key: (props: MSAViewerProps) => string
  apply: (model: MsaViewModel, props: MSAViewerProps) => void
  inSnapshot?: boolean
}

function plainCopy<T>(value: T): T
function plainCopy(value: unknown): unknown {
  return Array.isArray(value)
    ? value.map(plainCopy)
    : typeof value === 'object' && value !== null
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, plainCopy(v)]),
        )
      : value
}

function propCopy<T>(value: T): T
function propCopy(value: unknown): unknown {
  return value === null ? undefined : plainCopy(value)
}

function synced<T>(
  read: (props: MSAViewerProps) => T,
  apply: (model: MsaViewModel, value: T, props: MSAViewerProps) => void,
  { inSnapshot = false } = {},
): SyncedProp {
  return {
    key: props => JSON.stringify(read(props) ?? null),
    apply: (model, props) => {
      apply(model, propCopy(read(props)), props)
    },
    inSnapshot,
  }
}

function ifSet<T>(set: (model: MsaViewModel, value: T) => void) {
  return (model: MsaViewModel, value: T | undefined) => {
    if (value !== undefined) {
      set(model, value)
    }
  }
}

/**
 * How each prop reaches the mounted model. `inSnapshot` marks a prop the
 * snapshot already applied, so only a later change reaches its setter.
 */
const syncedProps = [
  synced(
    p => p.height,
    ifSet((m, v) => {
      m.setHeight(v)
    }),
  ),
  synced(
    p => p.colWidth,
    ifSet((m, v) => {
      m.setColWidth(v)
    }),
  ),
  synced(
    p => p.rowHeight,
    ifSet((m, v) => {
      m.setRowHeight(v)
    }),
  ),
  synced(
    p => p.allowedGappyness,
    ifSet((m, v) => {
      m.setAllowedGappyness(v)
    }),
  ),
  synced(
    p => p.drawTree,
    ifSet((m, v) => {
      m.setDrawTree(v)
    }),
  ),
  synced(
    p => p.treeAreaWidth,
    ifSet((m, v) => {
      m.setTreeAreaWidth(v)
    }),
  ),
  synced(
    p => p.showBranchLen,
    ifSet((m, v) => {
      m.setShowBranchLen(v)
    }),
  ),
  synced(
    p => p.treeOrder,
    ifSet((m, v) => {
      m.setTreeOrder(v)
    }),
  ),
  synced(
    p => p.residueEncoding,
    ifSet((m, v) => {
      m.setBgColor(v === 'fill')
    }),
  ),
  synced(
    p => !!p.hideHeader,
    (m, v) => {
      m.setHideHeader(v)
    },
  ),
  synced(
    p => p.relativeTo,
    (m, v) => {
      m.drawRelativeTo(v)
    },
  ),
  synced(
    p => p.gffFilehandle,
    (m, location, { gff }) => {
      m.setGFFFilehandle(location)
      if (!location) {
        m.setGFF(gff)
      }
    },
    { inSnapshot: true },
  ),
  synced(
    p => p.gff,
    (m, v) => {
      m.setGFF(v)
    },
    { inSnapshot: true },
  ),
  synced(
    p => p.colorScheme,
    (m, scheme) => {
      if (typeof scheme === 'string') {
        m.setColorSchemeName(scheme)
      } else if (scheme) {
        m.setCustomColorScheme(letterColors(scheme))
      }
    },
  ),
  synced(viewerHighlights, (m, v) => {
    m.setHighlights(v)
  }),
  synced(
    p => p.features ?? [],
    (m, v) => {
      m.setFeatures(v)
    },
  ),
  synced(
    p => p.selection,
    (m, v) => {
      m.setSelection(v)
    },
  ),
  synced(
    p => p.trimToSelection,
    ifSet((m, v) => {
      m.setTrimToSelection(v)
    }),
  ),
  synced(
    p => p.treeRoot,
    (m, v) => {
      m.setTreeRoot(v)
    },
  ),
  synced(
    p => p.clades ?? [],
    (m, v) => {
      m.setClades(v)
    },
  ),
  synced(
    p => p.columnTracks ?? [],
    (m, v) => {
      m.setColumnTracks(v)
    },
  ),
  synced(
    p => p.residueMappings ?? [],
    (m, v) => {
      m.setResidueMappings(v)
    },
  ),
  synced(
    p => p.rowData,
    (m, table) => {
      if (table && Object.keys(table).length) {
        m.setRowData(table)
      }
    },
  ),
  synced(
    p => p.encodings ?? [],
    (m, v) => {
      m.setEncodings(v)
    },
  ),
  synced(
    p => p.rowPanels ?? [],
    (m, v) => {
      m.setRowPanels(v)
    },
  ),
  synced(
    p => p.rowTransform,
    (m, v) => {
      m.setRowTransform(v)
    },
  ),
]

/**
 * Applies each prop whose content changed since the last render. Comparing
 * JSON keys lets a host pass a freshly computed array every render, and
 * applying only a changed prop keeps a change made inside the viewer across
 * the host's next render. The model receives a copy, never the host's
 * own object.
 */
function useSyncedProps(model: MsaViewModel, props: MSAViewerProps) {
  const applied = useRef<string[] | undefined>(undefined)
  useEffect(() => {
    const keys = syncedProps.map(({ key }) => key(props))
    applied.current ??= syncedProps.map(({ inSnapshot }, i) =>
      inSnapshot ? keys[i]! : '',
    )
    const last = applied.current
    syncedProps.forEach(({ apply }, i) => {
      const key = keys[i]!
      if (last[i] !== key) {
        last[i] = key
        apply(model, props)
      }
    })
  })
}

function Viewer({
  modelRef,
  ...props
}: MSAViewerProps & { modelRef: ForwardedRef<MsaViewModel> }) {
  const {
    region,
    theme,
    onCellHover,
    onCellClick,
    onViewportChange,
    onSelectionChange,
    onModel,
  } = props
  const [model] = useState(() => {
    const created = MSAModelF().create(viewerSnapshot(props))
    created.setImportForm(false)
    return created
  })

  const destroyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  const [ref, { width }] = useMeasure()
  useEffect(() => {
    if (width) {
      model.setWidth(width)
    }
  }, [model, width])

  useSyncedProps(model, props)

  const regionKey = JSON.stringify(region ?? null)
  useEffect(() => {
    const target: unknown = JSON.parse(regionKey)
    return isRegion(target)
      ? when(
          () => model.viewInitialized && model.numColumns > 0,
          () => {
            model.revealRegion(target)
          },
        )
      : undefined
  }, [model, regionKey])

  useModelReaction(model, 'hoveredCell', onCellHover)
  useModelReaction(model, 'clickedCell', onCellClick)
  useModelReaction(model, 'viewport', onViewportChange)
  useModelReaction(model, 'selection', onSelectionChange)

  useImperativeHandle(modelRef, () => model, [model])

  const latestOnModel = useRef(onModel)
  useEffect(() => {
    latestOnModel.current = onModel
  })
  useEffect(() => {
    latestOnModel.current?.(model)
  }, [model, latestOnModel])

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
