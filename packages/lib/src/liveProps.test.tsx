// @vitest-environment jsdom
//
// MSAViewer builds its model once. These check that its props stay live, and
// that changes made inside the viewer survive the host's next render.
import React, { act } from 'react'

import { isAlive } from '@jbrowse/mobx-state-tree'
import { useTheme } from '@mui/material/styles'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest'

import MSAViewer from './components/MSAViewer.tsx'

import type { MsaViewModel } from './model.ts'
import type { Theme } from '@mui/material/styles'
import type { Root } from 'react-dom/client'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

// stub Loading, which draws to canvas, and capture the model MSAViewer built
// and the theme it provided
let captured: MsaViewModel | undefined
let capturedTheme: Theme | undefined
// jsdom measures every element at zero, so the model never gets a width and
// anything reading msaAreaWidth throws. jbrowse-components maps the same module
// to the same kind of stub for its jsdom suites.
vi.mock('@jbrowse/core/util/useMeasure', () => ({
  default: () => [{ current: undefined }, { width: 808, height: 100000 }],
}))

vi.mock('./components/Loading.tsx', () => ({
  default: function Loading({ model }: { model: MsaViewModel }) {
    captured = model
    capturedTheme = useTheme()
    return null
  },
}))

const msa = '>human\nMKAANSE\n>mouse\nMKA-NSE\n'

let container: HTMLDivElement
let root: Root

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return {
      canvas: this,
      font: '10px sans-serif',
      measureText: (text: string) => ({ width: text.length * 6 }),
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

beforeEach(() => {
  captured = undefined
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function show(props: Record<string, unknown>) {
  act(() => {
    root.render(<MSAViewer msa={msa} {...props} />)
  })
  return captured!
}

test('the model is built once and reused across renders', () => {
  const model = show({ height: 300 })
  show({ height: 400 })
  expect(captured).toBe(model)
})

test('height, color scheme and zoom follow the props', () => {
  const model = show({
    height: 300,
    residueColor: { scale: { scheme: 'clustal' } },
    colWidth: 10,
    rowHeight: 12,
  })
  expect(model.height).toBe(300)

  show({
    height: 700,
    residueColor: { scale: { scheme: 'lesk' } },
    colWidth: 4,
    rowHeight: 6,
  })
  expect(model.height).toBe(700)
  expect(model.resolvedResidueColor.scheme).toBe('lesk')
  expect(model.colWidth).toBe(4)
  expect(model.rowHeight).toBe(6)
})

test('residueColor takes a scheme name or a letter map', () => {
  const kBlue = { scale: { domain: ['K'], range: ['#1f77b4'] } }
  const model = show({ residueColor: kBlue })
  expect(model.resolvedResidueColor.letters).toEqual({ K: '#1f77b4' })
  expect(model.colorScheme.K).toBe('#1f77b4')

  show({ residueColor: kBlue })
  expect(model.resolvedResidueColor.letters).toEqual({ K: '#1f77b4' })

  show({ residueColor: { scale: { domain: ['R'], range: ['#d62728'] } } })
  expect(model.resolvedResidueColor.letters).toEqual({ R: '#d62728' })

  show({ residueColor: { scale: { scheme: 'lesk' } } })
  expect(model.resolvedResidueColor.letters).toBeUndefined()
  expect(model.resolvedResidueColor.scheme).toBe('lesk')
})

test('dropping relativeTo turns the reference diff back off', () => {
  const model = show({ relativeTo: 'human' })
  expect(model.relativeTo).toBe('human')
  show({})
  expect(model.relativeTo).toBeUndefined()
})

test('the tree gutter follows drawTree and treeAreaWidth', () => {
  const model = show({ drawTree: true, treeAreaWidth: 200 })
  show({ drawTree: false, treeAreaWidth: 132 })
  expect(model.drawTree).toBe(false)
  expect(model.effectiveTreeAreaWidth).toBe(132)
})

test('with no treeAreaWidth the gutter fits, and the prop wins over the fit', () => {
  const model = show({})
  expect(model.treeAreaWidth).toBeUndefined()
  expect(model.effectiveTreeAreaWidth).toBe(model.fittedTreeAreaWidth)
  show({ treeAreaWidth: model.fittedTreeAreaWidth + 50 })
  expect(model.effectiveTreeAreaWidth).toBe(model.fittedTreeAreaWidth + 50)
})

test('the residueColor channel follows the prop, and the flip keeps the scroll position', () => {
  // wider than the alignment pane, so there is a scroll position to keep
  const wide = `>human\n${'MKAANSE'.repeat(40)}\n>mouse\n${'MKA-NSE'.repeat(40)}\n`
  const render = (channel: 'fill' | 'color') => {
    act(() => {
      root.render(<MSAViewer msa={wide} residueColor={{ channel }} />)
    })
    return captured!
  }

  const model = render('color')
  expect(model.cellFill).toBe('none')
  act(() => {
    model.setScrollX(-240)
  })

  expect(render('fill')).toBe(model)
  expect(model.cellFill).toBe('residue')
  expect(model.scrollX).toBe(-240)
})

test('a viewer given no residueColor colors the background', () => {
  expect(show({}).cellFill).toBe('residue')
})

test('a change made inside the viewer survives the host re-rendering', () => {
  // the host passes only height; the user changes row height and scheme
  const model = show({ height: 300 })
  act(() => {
    model.setRowHeight(30)
    model.setResidueColor({ scale: { scheme: 'flower' } })
  })
  show({ height: 320 })
  expect(model.height).toBe(320)
  expect(model.rowHeight).toBe(30)
  expect(model.resolvedResidueColor.scheme).toBe('flower')
})

test('the data layers follow their props', () => {
  const model = show({ height: 300 })
  expect(model.highlights).toEqual([])

  show({
    height: 300,
    highlights: [{ start: 2, end: 4, label: 'motif' }],
    columnTracks: [{ id: 't', name: 'T', kind: 'bar', values: [1, 0, 1] }],
    residueMappings: [
      {
        row: 'human',
        accession: 'P1',
        structure: { id: '1ABC', kind: 'experimental', asymId: 'A' },
        segments: [{ rowStart: 1, rowEnd: 7, structStart: 1, structEnd: 7 }],
      },
    ],
    highlightColumns: [1, 2],
  })

  expect(model.highlights.map(h => h.label)).toEqual(['motif', undefined])
  expect(model.columnTracks.map(t => t.id)).toEqual(['t'])
  expect(model.mappedStructures.map(m => m.structure.id)).toEqual(['1ABC'])
})

test('highlightColumns draws 1-based columns as highlights, one per run', () => {
  const model = show({
    highlights: [{ start: 2, end: 2, label: 'site' }],
    highlightColumns: [7, 3, 4, 5, 3],
  })
  expect(model.highlights).toEqual([
    { start: 2, end: 2, label: 'site' },
    { start: 3, end: 5 },
    { start: 7, end: 7 },
  ])
  expect(model.highlightColumns).toBeUndefined()
  expect(model.highlightedColumns).toBeUndefined()

  show({ highlightColumns: [1] })
  expect(model.highlights).toEqual([{ start: 1, end: 1 }])
})

test('highlightColumns counts columns a hidden gappy column does not shift', () => {
  const model = show({ allowedGappyness: 50, highlightColumns: [5] })
  const [band] = model.resolvedHighlights
  expect(band).toMatchObject({ startCol: 3, endCol: 3 })
})

test('an empty rowData table leaves the loaded table in place', () => {
  const model = show({ rowData: { human: { host: 'primate' } } })
  expect(model.rowData.human).toEqual({ host: 'primate' })
  show({ rowData: {} })
  expect(model.rowData.human).toEqual({ host: 'primate' })
  show({ rowData: { human: { host: 'ape' } } })
  expect(model.rowData.human).toEqual({ host: 'ape' })
})

test('dropping a scalar prop keeps the value the model holds', () => {
  const model = show({ height: 300, colWidth: 12 })
  show({})
  expect(model.height).toBe(300)
  expect(model.colWidth).toBe(12)
})

test('selection follows its prop and reports the changes made inside the viewer', () => {
  const reported: unknown[] = []
  const onSelectionChange = (selection: unknown) => reported.push(selection)
  const block = { start: 2, end: 4, rows: ['mouse'] }
  const model = show({ selection: block, onSelectionChange })
  expect(model.selection).toEqual(block)
  expect(model.selectionFasta).toBe('>mouse\nKA-\n')

  act(() => {
    model.selectBlock({ col: 0 }, { col: 1 })
  })
  // the host's next render passes the selection it passed before, which
  // leaves the reader's in place
  show({ selection: { ...block }, onSelectionChange })
  expect(model.selection).toEqual({ start: 1, end: 2 })

  show({ selection: { start: 5, end: 6 }, onSelectionChange })
  act(() => {
    model.clearSelection()
  })
  expect(reported).toEqual([
    { start: 1, end: 2 },
    { start: 5, end: 6 },
    undefined,
  ])
})

test('a layer passed as a fresh array each render is not replaced each render', () => {
  const model = show({ height: 300, highlights: [{ start: 2, end: 4 }] })
  const before = model.highlights[0]
  show({ height: 301, highlights: [{ start: 2, end: 4 }] })
  expect(model.highlights[0]).toBe(before)
})

test('unmounting destroys the model it built', async () => {
  const model = show({ height: 300 })
  act(() => {
    root.unmount()
  })
  // deferred by a tick, so a StrictMode remount can cancel it
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  expect(isAlive(model)).toBe(false)
  // afterEach unmounts again, which is fine on an unmounted root
})

test('a StrictMode double mount keeps its model alive', async () => {
  let captured2: MsaViewModel | undefined
  act(() => {
    root.render(
      <React.StrictMode>
        <MSAViewer msa={msa} height={300} />
      </React.StrictMode>,
    )
  })
  captured2 = captured
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
  expect(isAlive(captured2!)).toBe(true)
})

test('hideHeader follows its prop', () => {
  const model = show({ hideHeader: true })
  expect(model.hideHeader).toBe(true)
  show({})
  expect(model.hideHeader).toBe(false)
})

test('a new alignment builds a new model', () => {
  const model = show({ height: 300 })
  act(() => {
    root.render(<MSAViewer msa={'>a\nMK\n>b\nMR\n'} height={300} />)
  })
  expect(captured).not.toBe(model)
  expect(captured!.rowNames).toEqual(['a', 'b'])
})

test('a ref holds the current model, as onModel reports it', () => {
  const ref = React.createRef<MsaViewModel>()
  const reported: MsaViewModel[] = []
  const render = (text: string) => {
    act(() => {
      root.render(
        <MSAViewer ref={ref} msa={text} onModel={m => reported.push(m)} />,
      )
    })
  }
  render(msa)
  expect(ref.current).toBe(captured)
  render('>a\nMK\n>b\nMR\n')
  expect(ref.current).toBe(captured)
  expect(ref.current!.rowNames).toEqual(['a', 'b'])
  expect(reported).toEqual([reported[0], ref.current])
  act(() => {
    root.unmount()
  })
  expect(ref.current).toBeNull()
})

test('a new gff keeps the model and its view, and removing it clears the annotations', () => {
  const gff = (end: number) =>
    `##gff-version 3\nhuman\tpfam\tdomain\t2\t${end}\t.\t.\t.\tName=d`
  const model = show({ gff: gff(4), colWidth: 20 })
  expect(model.annotations.map(a => a.end)).toEqual([4])
  model.setColWidth(30)
  model.setSelection({ start: 2, end: 3 })

  show({ gff: gff(6), colWidth: 20 })
  expect(captured).toBe(model)
  expect(model.annotations.map(a => a.end)).toEqual([6])
  expect(model.colWidth).toBe(30)
  expect(model.selection).toEqual({ start: 2, end: 3 })

  show({ colWidth: 20 })
  expect(captured).toBe(model)
  expect(model.annotations).toEqual([])
  expect(model.data.gff).toBeUndefined()
})

test('a new gffFilehandle loads into the same model, and removing it clears', async () => {
  const served: Record<string, string> = {
    'https://example.com/a.gff': `##gff-version 3\nhuman\tpfam\tdomain\t2\t4\t.\t.\t.\tName=d`,
    'https://example.com/b.gff': `##gff-version 3\nhuman\tpfam\tdomain\t2\t6\t.\t.\t.\tName=d`,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input)
      return Promise.resolve(new Response(served[url]))
    }),
  )
  const at = (name: string) => ({
    uri: `https://example.com/${name}.gff`,
    locationType: 'UriLocation' as const,
  })
  try {
    const model = show({ gffFilehandle: at('a') })
    await vi.waitFor(() => {
      expect(model.annotations.map(a => a.end)).toEqual([4])
    })

    show({ gffFilehandle: at('b') })
    expect(captured).toBe(model)
    await vi.waitFor(() => {
      expect(model.annotations.map(a => a.end)).toEqual([6])
    })

    show({})
    expect(model.annotations).toEqual([])
  } finally {
    vi.unstubAllGlobals()
  }
})

test('msaUrl, treeUrl and gffUrl load like their filehandles', async () => {
  const served: Record<string, string> = {
    'https://example.com/a.fa': '>human\nMKAANSE\n>mouse\nMKA-NSE\n',
    'https://example.com/b.fa': '>rat\nMKAANSE\n>cow\nMKA-NSE\n',
    'https://example.com/t.nh': '(human:0.1,mouse:0.2);',
    'https://example.com/d.gff': `##gff-version 3\nhuman\tpfam\tdomain\t2\t4\t.\t.\t.\tName=d`,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input)
      return Promise.resolve(new Response(served[url]))
    }),
  )
  const at = (urls: Record<string, string>) => {
    act(() => {
      root.render(<MSAViewer height={300} {...urls} />)
    })
    return captured!
  }
  try {
    const urls = {
      msaUrl: 'https://example.com/a.fa',
      treeUrl: 'https://example.com/t.nh',
      gffUrl: 'https://example.com/d.gff',
    }
    const model = at(urls)
    expect(model.msaFilehandle).toEqual({
      uri: urls.msaUrl,
      locationType: 'UriLocation',
    })
    await vi.waitFor(() => {
      expect(model.rowNames).toEqual(['human', 'mouse'])
      expect(model.annotations.map(a => a.end)).toEqual([4])
    })
    expect(model.treeFilehandle).toEqual({
      uri: urls.treeUrl,
      locationType: 'UriLocation',
    })

    expect(at({ ...urls })).toBe(model)
    expect(at({ ...urls, msaUrl: 'https://example.com/b.fa' })).not.toBe(model)
  } finally {
    vi.unstubAllGlobals()
  }
})

test('features follow their prop on the same model', () => {
  const model = show({
    features: [{ row: 'human', start: 2, end: 4, name: 'd' }],
  })
  expect(model.filteredAnnotations.map(a => a.end)).toEqual([4])

  show({ features: [{ row: 'mouse', start: 1, end: 3, name: 'e' }] })
  expect(captured).toBe(model)
  expect(model.filteredAnnotations.map(a => a.id)).toEqual(['mouse'])

  show({})
  expect(model.noDomains).toBe(true)
})

test('a gff opened inside the viewer survives the host re-rendering', () => {
  const model = show({ height: 300 })
  model.setGFF('##gff-version 3\nhuman\tpfam\tdomain\t2\t4\t.\t.\t.\tName=d')
  show({ height: 301 })
  expect(model.annotations).toHaveLength(1)
})

test('an inline filehandle equal to the last one keeps the model', () => {
  const location = () => ({
    uri: 'https://example.com/a.fa',
    locationType: 'UriLocation' as const,
  })
  act(() => {
    root.render(<MSAViewer msaFilehandle={location()} height={300} />)
  })
  const model = captured
  act(() => {
    root.render(<MSAViewer msaFilehandle={location()} height={301} />)
  })
  expect(captured).toBe(model)
})

test('hover and click report cells in 1-based host coordinates', () => {
  const hovers: unknown[] = []
  const clicks: unknown[] = []
  const model = show({
    onCellHover: (cell: unknown) => hovers.push(cell),
    onCellClick: (cell: unknown) => clicks.push(cell),
  })
  const mouse = model.rowNames.indexOf('mouse')
  act(() => {
    model.setMousePos(4, mouse)
    model.setMouseClickPos(4, mouse)
  })
  act(() => {
    model.setMousePos(3, mouse)
  })
  act(() => {
    model.setMousePos()
  })
  expect(hovers).toEqual([
    { column: 5, row: 'mouse', residue: 4, letter: 'N' },
    { column: 4, row: 'mouse', residue: undefined, letter: '-' },
    undefined,
  ])
  expect(clicks).toEqual([{ column: 5, row: 'mouse', residue: 4, letter: 'N' }])
})

test('the latest handler receives events without resubscribing', () => {
  const first: unknown[] = []
  const second: unknown[] = []
  const model = show({ onCellHover: (c: unknown) => first.push(c) })
  show({ onCellHover: (c: unknown) => second.push(c) })
  act(() => {
    model.setMousePos(0, 0)
  })
  expect(first).toEqual([])
  expect(second).toHaveLength(1)
})

test('theme selects dark mode or merges host options', () => {
  show({})
  expect(capturedTheme!.palette.mode).toBe('light')
  show({ theme: 'dark' })
  expect(capturedTheme!.palette.mode).toBe('dark')
  show({ theme: { palette: { primary: { main: '#8e24aa' } } } })
  expect(capturedTheme!.palette.primary.main).toBe('#8e24aa')
  expect(capturedTheme!.palette.tertiary).toBeDefined()
})
