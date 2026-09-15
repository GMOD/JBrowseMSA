import { mount } from 'react-msaview'

import { hostTheme, watchHostTheme } from './hostTheme.ts'

import type { AnyModel, Render } from '@anywidget/types'
import type {
  Cell,
  ColumnTrackSpec,
  Highlight,
  MSAViewerProps,
  MountedViewer,
  Viewport,
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
  highlights: Highlight[]
  column_tracks: ColumnTrackSpec[]
  relative_to: string | null
  draw_tree: boolean
  show_branch_len: boolean
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
  'highlights',
  'column_tracks',
  'relative_to',
  'draw_tree',
  'show_branch_len',
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
    highlights: model.get('highlights'),
    columnTracks: model.get('column_tracks'),
    relativeTo: optional(model.get('relative_to')),
    drawTree: model.get('draw_tree'),
    showBranchLen: model.get('show_branch_len'),
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

export const render: Render<Traits> = ({ model, el }) => {
  let settle: ReturnType<typeof setTimeout> | undefined
  let viewer: MountedViewer
  try {
    viewer = mount(el, {
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

export default { render }
