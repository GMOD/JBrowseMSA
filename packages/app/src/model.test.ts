// @vitest-environment jsdom
import { expect, test } from 'vitest'

import {
  createApp,
  decodeParam,
  encodeParam,
  linkParam,
  maxLinkLength,
  shareLink,
} from './model'

const msa = '>human\nMKAANSE\n>mouse\nMKA-NSE'

test('no ?data= opens the import form without an error', async () => {
  const app = await createApp(null)
  expect(app.msaview.error).toBeUndefined()
  expect(app.msaview.dataInitialized).toBe(false)
})

test('?data= takes the app snapshot', async () => {
  const app = await createApp(
    JSON.stringify({ msaview: { type: 'MsaView', data: { msa } } }),
  )
  expect(app.msaview.error).toBeUndefined()
  expect(app.msaview.rows.length).toBe(2)
})

test('?data= takes a bare MsaView snapshot, as docs/layers.md writes it', async () => {
  const app = await createApp(
    JSON.stringify({
      type: 'MsaView',
      data: { msa },
      highlights: [{ start: 2, end: 3, label: 'KA' }],
    }),
  )
  expect(app.msaview.error).toBeUndefined()
  expect(app.msaview.rows.length).toBe(2)
  expect(app.msaview.highlights.length).toBe(1)
})

test('?data= takes the shorthand expandSpec reads', async () => {
  const app = await createApp(
    JSON.stringify({
      type: 'MsaView',
      msa,
      query: 'human',
      highlights: [3],
      columnTracks: [{ name: 'Score', start: 2, values: [1, 0.5] }],
    }),
  )
  expect(app.msaview.error).toBeUndefined()
  expect(app.msaview.relativeTo).toBe('human')
  expect(app.msaview.resolvedHighlights[0]?.label).toBe('A3')
  expect(app.msaview.columnTracks[0]).toMatchObject({
    id: 'score',
    kind: 'bar',
    row: 'human',
    values: [0, 1, 0.5],
  })
})

test('a malformed shorthand opens on an error naming it', async () => {
  const app = await createApp(
    JSON.stringify({ type: 'MsaView', msa, region: 'x' }),
  )
  expect(String(app.msaview.error)).toMatch(/region "x"/)
})

test.each([
  ['unparsable JSON', '{"type":"MsaView",'],
  ['an object that is not a view', '{"data":{"msa":">a\\nA"}}'],
  [
    'a snapshot the model rejects',
    '{"msaview":{"type":"MsaView","height":"tall"}}',
  ],
  ['a z. value that is not gzip', 'z.bm90IGd6aXA'],
])('?data= with %s opens on an error', async (_, param) => {
  const app = await createApp(param)
  expect(String(app.msaview.error)).toMatch(/link's data= parameter/)
})

const href = 'https://gmod.org/JBrowseMSA/demo/'

test('encodeParam gzips the snapshot into URL-safe text decodeParam reads back', async () => {
  const snapshot = { msaview: { type: 'MsaView', data: { msa } } }
  const param = await encodeParam(snapshot)
  expect(param).toMatch(/^z\.[\w-]+$/)
  expect(JSON.parse(await decodeParam(param))).toEqual(snapshot)
})

test('decodeParam passes plain JSON through', async () => {
  expect(await decodeParam('{"type":"MsaView"}')).toBe('{"type":"MsaView"}')
})

test('?data= takes a gzipped snapshot', async () => {
  const app = await createApp(
    await encodeParam({ type: 'MsaView', data: { msa } }),
  )
  expect(app.msaview.error).toBeUndefined()
  expect(app.msaview.rows.length).toBe(2)
})

test('shareLink round-trips the view through the gzipped #data=', async () => {
  const app = await createApp(
    JSON.stringify({ msaview: { type: 'MsaView', data: { msa } } }),
  )
  const link = await shareLink(app, href)
  const url = new URL(link.url!)
  expect(url.hash).toMatch(/^#data=z\./)
  const reopened = await createApp(linkParam(url))
  expect(reopened.msaview.rows.length).toBe(2)
  expect(reopened.msaview.data.msa).toBe(msa)
})

test('shareLink moves an old ?data= link into the fragment', async () => {
  const app = await createApp(
    JSON.stringify({ msaview: { type: 'MsaView', data: { msa } } }),
  )
  const link = await shareLink(app, `${href}?data=old&other=1#stale`)
  const url = new URL(link.url!)
  expect(url.search).toBe('?other=1')
  expect(url.hash).toMatch(/^#data=z\./)
})

test('linkParam reads #data= first and falls back to ?data=', () => {
  expect(linkParam({ hash: '#data=new', search: '?data=old' })).toBe('new')
  expect(linkParam({ hash: '', search: '?data=old' })).toBe('old')
  expect(linkParam({ hash: '#other=1', search: '' })).toBeNull()
})

function randomProtein(length: number) {
  let seed = 1
  return Array.from({ length }, () => {
    seed = (seed * 16807) % 2147483647
    return 'ACDEFGHIKLMNPQRSTVWY'[seed % 20]
  }).join('')
}

// random residues compress to about 0.7 link characters each, so two
// documents each under the inline cap still make a link past maxLinkLength
test('shareLink refuses a link past maxLinkLength', async () => {
  const app = await createApp(
    JSON.stringify({
      type: 'MsaView',
      data: {
        msa: `>a\n${randomProtein(900_000)}`,
        treeMetadata: randomProtein(900_000),
      },
    }),
  )
  expect(app.msaview.unshareableData).toEqual([])
  const link = await shareLink(app, href)
  expect(link.url).toBeUndefined()
  expect(link.problem).toMatch(
    `over the ${maxLinkLength.toLocaleString('en-US')}`,
  )
})

test('shareLink names a document the snapshot dropped', async () => {
  const app = await createApp(
    JSON.stringify({
      type: 'MsaView',
      data: { msa: `>a\n${randomProtein(maxLinkLength + 1000)}` },
    }),
  )
  const link = await shareLink(app, href)
  expect(link.problem).toMatch(/^The alignment \(1001 kB\) came from/)
})
