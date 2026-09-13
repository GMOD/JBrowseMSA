// What a download that is no longer wanted leaves behind. The loaders guarded
// against a stale response landing in the model, but the request itself ran to
// completion, and the status line it was writing stayed on screen after a
// reset -- "Downloading file" and a Cancel button, over the import form.
import { beforeEach, expect, test, vi } from 'vitest'

import MSAModelF from './model.ts'

import type { FetchStatus } from './fetchUtils.ts'
import type * as FetchUtils from './fetchUtils.ts'

interface Pending {
  resolve: (text: string) => void
  reject: (e: unknown) => void
  setStatus: (status?: FetchStatus) => void
  controller: AbortController
}

const inFlight = new Map<string, Pending>()

vi.mock('@jbrowse/core/util/io', () => ({
  openLocation: (loc: { uri?: string; name?: string }) => loc,
}))

vi.mock('./fetchUtils.ts', async importOriginal => ({
  ...(await importOriginal<typeof FetchUtils>()),
  fetchTextWithProgress: (
    loc: { uri?: string; name?: string },
    setStatus: (status?: FetchStatus) => void,
    {
      controller = new AbortController(),
    }: { controller?: AbortController } = {},
  ) =>
    new Promise<string>((resolve, reject) => {
      inFlight.set(loc.uri ?? loc.name!, {
        resolve,
        reject,
        setStatus,
        controller,
      })
      controller.signal.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'))
      })
    }),
}))

function uri(u: string) {
  return { locationType: 'UriLocation' as const, uri: u }
}

function flush() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function makeModel() {
  const model = MSAModelF().create({ type: 'MsaView' })
  model.setWidth(800)
  return model
}

beforeEach(() => {
  inFlight.clear()
})

test('a reset mid-download aborts it and takes the status line with it', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('aln.fa'))
  const pending = inFlight.get('aln.fa')!
  pending.setStatus({ msg: 'Downloading file' })
  expect(model.status?.msg).toBe('Downloading file')

  model.reset()
  await flush()

  expect(pending.controller.signal.aborted).toBe(true)
  expect(model.status).toBeUndefined()
  expect(model.loadingMSA).toBe(false)
})

test('a replaced filehandle abandons the download it replaced', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('first.fa'))
  const first = inFlight.get('first.fa')!
  model.setMSAFilehandle(uri('second.fa'))
  await flush()

  expect(first.controller.signal.aborted).toBe(true)

  inFlight.get('second.fa')!.resolve('>seq1\nACDE')
  await flush()
  expect(model.data.msa).toBe('>seq1\nACDE')
})

test('an optional layer that fails is a warning, not the end of the view', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('aln.fa'))
  model.setGFFFilehandle(uri('domains.gff'))
  inFlight.get('aln.fa')!.resolve('>seq1\nACDE')
  inFlight.get('domains.gff')!.reject(new Error('HTTP 404'))
  await flush()

  // the alignment is still on screen, and the failure is said out loud
  expect(model.dataInitialized).toBe(true)
  expect(model.error).toBeUndefined()
  expect(model.warnings.join(' ')).toContain('annotations')
  expect(model.warnings.join(' ')).toContain('404')
})

test('row metadata that fails does not replace the alignment either', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('aln.fa'))
  model.setTreeMetadataFilehandle(uri('meta.json'))
  inFlight.get('aln.fa')!.resolve('>seq1\nACDE')
  inFlight.get('meta.json')!.reject(new Error('HTTP 500'))
  await flush()

  expect(model.dataInitialized).toBe(true)
  expect(model.warnings.join(' ')).toContain('row metadata')
})

test('the alignment itself failing is still fatal', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('aln.fa'))
  inFlight.get('aln.fa')!.reject(new Error('HTTP 403'))
  await flush()

  expect(model.error).toBeDefined()
  expect(model.warnings).toEqual([])
})

test('a dismissed warning stays dismissed', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('aln.fa'))
  model.setGFFFilehandle(uri('domains.gff'))
  inFlight.get('aln.fa')!.resolve('>seq1\nACDE')
  inFlight.get('domains.gff')!.reject(new Error('HTTP 404'))
  await flush()

  model.clearWarnings()
  expect(model.warnings).toEqual([])
})
