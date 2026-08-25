// @vitest-environment jsdom
import { act } from 'react'

import { createTheme } from '@mui/material/styles'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadGene, searchGenes } from '../lib/geneExplorer'
import { DEFAULT_SPECIES } from '../lib/speciesGenes'
import GeneExplorer from './GeneExplorer'

import type * as GeneExplorerLib from '../lib/geneExplorer'
import type { GeneResult, Transcript } from '../lib/geneExplorer'
import type { Root } from 'react-dom/client'

// Only the two network entry points are mocked; buildSession/geneStats/
// collapsedLoc keep their real implementations so the result panel renders
// exactly as it does in the app (and exercises them against the fixture).
vi.mock('../lib/geneExplorer', async importOriginal => {
  const actual = await importOriginal<typeof GeneExplorerLib>()
  return { ...actual, loadGene: vi.fn(), searchGenes: vi.fn() }
})
// Swap the JBrowse theme for a plain MUI one — the island's control styling is
// irrelevant here and the real theme drags in browser-only @jbrowse/core code.
vi.mock('../lib/theme', () => ({ theme: createTheme() }))

// React's act() requires this flag when driving createRoot directly (no RTL).
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

const transcript: Transcript = {
  refName: '17',
  strand: -1,
  name: 'NM_000546.6',
  geneName: 'TP53',
  cds: [
    { start: 120, end: 200, phase: 0 },
    { start: 1000, end: 1080, phase: 1 },
  ],
}

function geneResult(geneName: string): GeneResult {
  return {
    species: DEFAULT_SPECIES,
    genome: {
      configUrl: 'https://example.com/config.json',
      assemblyName: 'hg38',
      geneTrackId: 'hg38-ncbiRefSeqSelect',
    },
    transcript: { ...transcript, geneName, name: `NM_${geneName}` },
    uniprotId: 'P04637',
    msa: {
      fasta: '>hg38\nMEEP',
      querySeqName: 'hg38',
      querySequence: 'MEEP',
      rowCount: 100,
    },
    proteinSequence: 'MEEP',
  }
}

// A promise whose settlement we control, to hold a load "in flight".
function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let container: HTMLElement
let root: Root

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.mocked(searchGenes).mockResolvedValue([])
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

function render() {
  act(() => {
    root.render(<GeneExplorer />)
  })
}

// Drive the page URL the same way the component's navigate() does, so
// useSyncExternalStore re-reads ?gene= and the effects fire.
function setGene(symbol: string | null) {
  const url = new URL(window.location.href)
  if (symbol) {
    url.searchParams.set('gene', symbol)
  } else {
    url.searchParams.delete('gene')
  }
  act(() => {
    window.history.pushState(null, '', url)
    window.dispatchEvent(new Event('gene-url-change'))
  })
}

async function flush() {
  await act(async () => {
    await new Promise(r => setTimeout(r))
  })
}

const spinner = () => container.querySelector('.MuiCircularProgress-root')

describe('GeneExplorer', () => {
  it('shows a spinner while the URL gene loads, then its result panel', async () => {
    const d = deferred<GeneResult>()
    vi.mocked(loadGene).mockReturnValue(d.promise)
    render()

    setGene('TP53')
    expect(loadGene).toHaveBeenCalledWith(
      'TP53',
      DEFAULT_SPECIES,
      expect.any(Function),
    )
    expect(spinner()).toBeTruthy() // busy is derived: URL gene != loaded gene

    d.resolve(geneResult('TP53'))
    await flush()

    expect(container.textContent).toContain('TP53')
    expect(container.textContent).toContain('NM_TP53')
    expect(container.textContent).toContain('100-species alignment')
    expect(spinner()).toBeFalsy()
  })

  it('ignores a stale in-flight response when the gene switches mid-load', async () => {
    const tp53 = deferred<GeneResult>()
    const kras = deferred<GeneResult>()
    vi.mocked(loadGene).mockImplementation((s: string) =>
      s === 'TP53' ? tp53.promise : kras.promise,
    )
    render()

    setGene('TP53')
    setGene('KRAS') // TP53 still in flight

    kras.resolve(geneResult('KRAS'))
    await flush()
    expect(container.textContent).toContain('NM_KRAS')

    // the superseded TP53 load resolves last; it must not clobber KRAS
    tp53.resolve(geneResult('TP53'))
    await flush()
    expect(container.textContent).toContain('NM_KRAS')
    expect(container.textContent).not.toContain('NM_TP53')
  })

  it('empties the result column when the gene is cleared from the URL', async () => {
    vi.mocked(loadGene).mockResolvedValue(geneResult('TP53'))
    render()

    setGene('TP53')
    await flush()
    expect(container.textContent).toContain('NM_TP53')

    setGene(null) // e.g. clearing the Autocomplete removes ?gene=
    await flush()
    expect(container.textContent).not.toContain('NM_TP53')
    expect(spinner()).toBeFalsy() // not stuck loading with no gene
  })

  it('offers the 5′→3′ flip only for minus-strand genes, on by default', async () => {
    vi.mocked(loadGene).mockResolvedValue(geneResult('TP53'))
    render()
    setGene('TP53')
    await flush()
    const flip = [...container.querySelectorAll('label')].find(l =>
      l.textContent?.includes('Read 5′→3′'),
    )
    expect(flip).toBeTruthy()
    expect(flip?.querySelector('input')?.checked).toBe(true)
    expect(container.textContent).toContain('ClinVar')
    expect(container.textContent).toContain('Preview alignment')

    const plus = geneResult('KRAS')
    plus.transcript.strand = 1
    vi.mocked(loadGene).mockResolvedValue(plus)
    setGene('KRAS')
    await flush()
    expect(container.textContent).not.toContain('Read 5′→3′')
    expect(container.textContent).not.toContain('ClinVar')
  })

  it('surfaces the load error for the current gene', async () => {
    const d = deferred<GeneResult>()
    vi.mocked(loadGene).mockReturnValue(d.promise)
    render()

    setGene('NOTAGENE')
    d.reject(new Error('No hg38 locus found for "NOTAGENE"'))
    await flush()

    expect(container.textContent).toContain('No hg38 locus found')
    expect(spinner()).toBeFalsy()
  })
})
