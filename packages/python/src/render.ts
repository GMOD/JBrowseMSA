import { hostTheme, watchHostTheme } from './hostTheme.ts'

import type { AnyModel, Render } from '@anywidget/types'
import type {
  Cell,
  ColumnTrackSpec,
  Encoding,
  Highlight,
  MSAViewerProps,
  MountedViewer,
  Region,
  ResidueMapping,
  Viewport,
  mount,
} from 'react-msaview'

/** the traits of msaview.MSAView, as they arrive from the kernel */
export interface Traits {
  msa: string
  tree: string
  gff: string
  msa_url: string
  tree_url: string
  gff_url: string
  color_scheme: string | null
  height: number | null
  col_width: number | null
  row_height: number | null
  allowed_gappyness: number | null
  highlights: Highlight[]
  highlight_columns: number[]
  column_tracks: ColumnTrackSpec[]
  residue_mappings: ResidueMapping[]
  row_data: Record<string, Record<string, string>>
  encodings: Encoding[]
  relative_to: string | null
  region: Region | null
  draw_tree: boolean
  tree_area_width: number | null
  auto_tree_area_width: boolean
  show_branch_len: boolean
  residue_encoding: 'fill' | 'color'
  hide_header: boolean
  theme: 'auto' | 'light' | 'dark' | Exclude<MSAViewerProps['theme'], string>
  clicked: Cell | null
  viewport: Viewport | null
}

type Model = AnyModel<Traits>

export const INPUT_TRAITS = [
  'msa',
  'tree',
  'gff',
  'msa_url',
  'tree_url',
  'gff_url',
  'color_scheme',
  'height',
  'col_width',
  'row_height',
  'allowed_gappyness',
  'highlights',
  'highlight_columns',
  'column_tracks',
  'residue_mappings',
  'row_data',
  'encodings',
  'relative_to',
  'region',
  'draw_tree',
  'tree_area_width',
  'auto_tree_area_width',
  'show_branch_len',
  'residue_encoding',
  'hide_header',
  'theme',
] as const

// the kernel sends traitlets' None as null, and MSAViewer reads an absent prop
// as "keep the default"
function optional<T>(value: T | null | '') {
  return value === null || value === '' ? undefined : value
}

function uriLocation(uri: string) {
  return uri ? { uri, locationType: 'UriLocation' as const } : undefined
}

export function propsFromModel(model: Model, doc?: Document): MSAViewerProps {
  const theme = model.get('theme')
  return {
    msa: optional(model.get('msa')),
    tree: optional(model.get('tree')),
    gff: optional(model.get('gff')),
    msaFilehandle: uriLocation(model.get('msa_url')),
    treeFilehandle: uriLocation(model.get('tree_url')),
    gffFilehandle: uriLocation(model.get('gff_url')),
    colorScheme: optional(model.get('color_scheme')),
    height: optional(model.get('height')),
    colWidth: optional(model.get('col_width')),
    rowHeight: optional(model.get('row_height')),
    allowedGappyness: optional(model.get('allowed_gappyness')),
    highlights: model.get('highlights'),
    highlightColumns: model.get('highlight_columns'),
    columnTracks: model.get('column_tracks'),
    residueMappings: model.get('residue_mappings'),
    rowData: model.get('row_data'),
    encodings: model.get('encodings'),
    relativeTo: optional(model.get('relative_to')),
    region: optional(model.get('region')),
    drawTree: model.get('draw_tree'),
    treeAreaWidth: optional(model.get('tree_area_width')),
    autoTreeAreaWidth: model.get('auto_tree_area_width'),
    showBranchLen: model.get('show_branch_len'),
    residueEncoding: model.get('residue_encoding'),
    hideHeader: model.get('hide_header'),
    theme: theme === 'auto' ? hostTheme(doc) : theme,
  }
}

function report<K extends 'clicked' | 'viewport'>(
  model: Model,
  trait: K,
  value: Traits[K] | undefined,
) {
  model.set(trait, value ?? null)
  model.save_changes()
}

// a drag scrolls through many column ranges a second, and each report is a
// comm message to the kernel, so the viewport goes out once the view settles
const VIEWPORT_SETTLE_MS = 150

function showError(el: HTMLElement, e: unknown) {
  const box = document.createElement('pre')
  box.style.cssText =
    'margin:0;padding:8px;white-space:pre-wrap;font:12px monospace;' +
    'color:#a00;background:#fff5f5;border:1px solid #a00'
  box.textContent = `msaview failed to render\n\n${e instanceof Error ? (e.stack ?? e.message) : String(e)}`
  el.append(box)
}

export const createRender =
  (mountViewer: typeof mount): Render<Traits> =>
  ({ model, el }) => {
    let settle: ReturnType<typeof setTimeout> | undefined
    let viewer: MountedViewer
    try {
      viewer = mountViewer(el, {
        ...propsFromModel(model),
        onCellClick: cell => {
          report(model, 'clicked', cell)
        },
        onViewportChange: viewport => {
          clearTimeout(settle)
          settle = setTimeout(() => {
            report(model, 'viewport', viewport)
          }, VIEWPORT_SETTLE_MS)
        },
      })
    } catch (e) {
      console.error(e)
      showError(el, e)
      return
    }

    const update = () => {
      viewer.update(propsFromModel(model))
    }
    for (const trait of INPUT_TRAITS) {
      model.on(`change:${trait}`, update)
    }
    const stopWatchingTheme = watchHostTheme(() => {
      if (model.get('theme') === 'auto') {
        update()
      }
    })

    return () => {
      clearTimeout(settle)
      stopWatchingTheme()
      for (const trait of INPUT_TRAITS) {
        model.off(`change:${trait}`, update)
      }
      viewer.destroy()
    }
  }
