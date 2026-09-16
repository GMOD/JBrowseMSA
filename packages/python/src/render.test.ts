// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'

import { createRender } from './render.ts'

import type { Traits } from './render.ts'
import type { MSAViewerProps } from 'react-msaview'

const mounted = {
  props: [] as MSAViewerProps[],
  destroyed: 0,
}

const render = createRender((_el, props) => {
  mounted.props.push(props)
  return {
    update: next => {
      mounted.props.push({ ...mounted.props.at(-1), ...next })
    },
    destroy: () => {
      mounted.destroyed++
    },
  }
})

const defaults: Traits = {
  msa: '',
  tree: '',
  gff: '',
  msa_url: '',
  tree_url: '',
  gff_url: '',
  color_scheme: null,
  height: null,
  col_width: null,
  row_height: null,
  allowed_gappyness: null,
  highlights: [],
  highlight_columns: [],
  column_tracks: [],
  residue_mappings: [],
  relative_to: null,
  region: null,
  draw_tree: true,
  tree_area_width: null,
  auto_tree_area_width: false,
  show_branch_len: true,
  bg_color: true,
  hide_header: false,
  theme: 'auto',
  clicked: null,
  viewport: null,
}

function fakeModel(traits: Partial<Traits>) {
  const store: Traits = { ...defaults, ...traits }
  const handlers = new Map<string, (() => void)[]>()
  const saved: Partial<Traits>[] = []
  const model = {
    get: <K extends keyof Traits>(k: K) => store[k],
    set: <K extends keyof Traits>(k: K, v: Traits[K]) => {
      store[k] = v
    },
    save_changes: () => {
      saved.push({ clicked: store.clicked, viewport: store.viewport })
    },
    on: (event: string, cb: () => void) => {
      handlers.set(event, [...(handlers.get(event) ?? []), cb])
    },
    off: (event: string, cb: () => void) => {
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter(h => h !== cb),
      )
    },
    change: <K extends keyof Traits>(k: K, v: Traits[K]) => {
      store[k] = v
      for (const cb of handlers.get(`change:${k}`) ?? []) {
        cb()
      }
    },
    handlers,
    saved,
  }
  return model
}

function renderWidget(
  model: ReturnType<typeof fakeModel>,
  el = document.createElement('div'),
  renderer = render,
) {
  return renderer({
    model: model as any,
    el,
    signal: new AbortController().signal,
    host: {} as any,
    experimental: {} as any,
  }) as (() => void) | undefined
}

afterEach(() => {
  mounted.props = []
  mounted.destroyed = 0
  delete document.body.dataset.jpThemeLight
  vi.restoreAllMocks()
})

test('traits become MSAViewer props, with empty values left unset', () => {
  renderWidget(
    fakeModel({
      msa: '>a\nMK\n',
      tree_url: 'https://example.org/t.nh',
      color_scheme: 'clustal',
      hide_header: true,
    }),
  )
  expect(mounted.props[0]).toMatchObject({
    msa: '>a\nMK\n',
    tree: undefined,
    msaFilehandle: undefined,
    treeFilehandle: {
      uri: 'https://example.org/t.nh',
      locationType: 'UriLocation',
    },
    colorScheme: 'clustal',
    height: undefined,
    relativeTo: undefined,
    hideHeader: true,
    theme: 'light',
  })
})

test('a trait change updates the mounted viewer', () => {
  const model = fakeModel({})
  renderWidget(model)
  model.change('highlights', [{ start: 3, end: 5 }])
  expect(mounted.props.at(-1)?.highlights).toEqual([{ start: 3, end: 5 }])
})

test('a click reports the cell to the kernel, and a clear reports null', () => {
  const model = fakeModel({})
  renderWidget(model)
  const cell = { column: 4, row: 'a', residue: 2, letter: 'K' }
  mounted.props[0]!.onCellClick!(cell)
  mounted.props[0]!.onCellClick!(undefined)
  expect(model.saved.map(s => s.clicked)).toEqual([cell, null])
})

test('the viewport reports once scrolling settles', () => {
  vi.useFakeTimers()
  const model = fakeModel({})
  renderWidget(model)
  for (let start = 1; start < 20; start++) {
    mounted.props[0]!.onViewportChange!({
      startColumn: start,
      endColumn: start + 30,
    })
  }
  expect(model.saved).toEqual([])
  vi.runAllTimers()
  expect(model.saved.map(s => s.viewport)).toEqual([
    { startColumn: 19, endColumn: 49 },
  ])
  vi.useRealTimers()
})

test("theme 'auto' follows JupyterLab's theme attribute as it changes", async () => {
  document.body.dataset.jpThemeLight = 'false'
  renderWidget(fakeModel({}))
  expect(mounted.props[0]?.theme).toBe('dark')
  document.body.dataset.jpThemeLight = 'true'
  await new Promise(resolve => setTimeout(resolve))
  expect(mounted.props.at(-1)?.theme).toBe('light')
})

test('an explicit theme ignores the host', () => {
  document.body.dataset.jpThemeLight = 'false'
  renderWidget(fakeModel({ theme: 'light' }))
  expect(mounted.props[0]?.theme).toBe('light')
})

test('a mount that throws leaves the error in the cell', () => {
  const el = document.createElement('div')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  renderWidget(
    fakeModel({}),
    el,
    createRender(() => {
      throw new Error('no canvas')
    }),
  )
  expect(el.textContent).toContain('no canvas')
})

test('cleanup unregisters the handlers and destroys the viewer', () => {
  const model = fakeModel({})
  renderWidget(model)?.()
  expect(mounted.destroyed).toBe(1)
  expect([...model.handlers.values()].flat()).toEqual([])
})
