// The reactive filehandle loaders in afterCreate: each fetches when its
// filehandle changes, and each guards against a stale response, since a user can
// pick a second file while the first is still downloading.
import { beforeEach, expect, test, vi } from 'vitest'

import MSAModelF from './model.ts'

import type * as FetchUtils from './fetchUtils.ts'

// uri -> settle functions for the fetch that autorun kicked off
const inFlight = new Map<
  string,
  { resolve: (text: string) => void; reject: (e: unknown) => void }
>()

vi.mock('@jbrowse/core/util/io', () => ({
  openLocation: (loc: { uri: string }) => loc,
}))

vi.mock('./fetchUtils.ts', async importOriginal => ({
  ...(await importOriginal<typeof FetchUtils>()),
  fetchTextWithProgress: (loc: { uri: string }) =>
    new Promise<string>((resolve, reject) => {
      inFlight.set(loc.uri, { resolve, reject })
    }),
}))

function uri(u: string) {
  return { locationType: 'UriLocation' as const, uri: u }
}

function fasta(seq: string) {
  return `>seq1\n${seq}`
}

// let the awaited fetch and the actions that follow it run
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

test('an msa filehandle loads into the model and clears its loading flag', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('aln.fa'))
  expect(model.loadingMSA).toBe(true)

  inFlight.get('aln.fa')!.resolve(fasta('ACDE'))
  await flush()

  expect(model.data.msa).toBe(fasta('ACDE'))
  expect(model.loadingMSA).toBe(false)
})

test('a slower earlier fetch never clobbers a newer one', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('first.fa'))
  model.setMSAFilehandle(uri('second.fa'))

  // the newer fetch finishes first, then the abandoned one comes back
  inFlight.get('second.fa')!.resolve(fasta('SECOND'))
  await flush()
  inFlight.get('first.fa')!.resolve(fasta('FIRST'))
  await flush()

  expect(model.data.msa).toBe(fasta('SECOND'))
  expect(model.loadingMSA).toBe(false)
})

test('a stale failure does not raise an error over live data', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('first.fa'))
  model.setMSAFilehandle(uri('second.fa'))

  inFlight.get('second.fa')!.resolve(fasta('SECOND'))
  await flush()
  inFlight.get('first.fa')!.reject(new Error('too slow'))
  await flush()

  expect(model.error).toBeUndefined()
  expect(model.data.msa).toBe(fasta('SECOND'))
})

test('cancelling drops the filehandle so the view returns to the import form', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('aln.fa'))

  inFlight.get('aln.fa')!.reject(new DOMException('Aborted', 'AbortError'))
  await flush()

  expect(model.msaFilehandle).toBeUndefined()
  expect(model.error).toBeUndefined()
  expect(model.loadingMSA).toBe(false)
})

test('a failed fetch surfaces as an error', async () => {
  const model = makeModel()
  model.setMSAFilehandle(uri('aln.fa'))

  inFlight.get('aln.fa')!.reject(new Error('404'))
  await flush()

  expect(model.error).toBeInstanceOf(Error)
  expect(model.loadingMSA).toBe(false)
})

test('tree, treeMetadata and gff filehandles each load into their own field', async () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    treeFilehandle: uri('tree.nh'),
    treeMetadataFilehandle: uri('meta.json'),
    gffFilehandle: uri('domains.gff'),
  })
  model.setWidth(800)

  inFlight.get('tree.nh')!.resolve('(a,b);')
  inFlight.get('meta.json')!.resolve('{"a":{"genome":"human"}}')
  inFlight
    .get('domains.gff')!
    .resolve(
      '##gff-version 3\na\tPfam\tprotein_match\t1\t2\t.\t.\t.\tName=PF00069',
    )
  await flush()

  expect(model.data.tree).toBe('(a,b);')
  expect(model.treeMetadata.a?.genome).toBe('human')
  expect(model.actuallyShowDomains).toBe(true)
  expect(model.loadingTree).toBe(false)
})
