// @vitest-environment jsdom
import { expect, test } from 'vitest'

import { createApp } from './model'

const msa = '>human\nMKAANSE\n>mouse\nMKA-NSE'

test('no ?data= opens the import form without an error', () => {
  const app = createApp(null)
  expect(app.msaview.error).toBeUndefined()
  expect(app.msaview.dataInitialized).toBe(false)
})

test('?data= takes the app snapshot', () => {
  const app = createApp(
    JSON.stringify({ msaview: { type: 'MsaView', data: { msa } } }),
  )
  expect(app.msaview.error).toBeUndefined()
  expect(app.msaview.rows.length).toBe(2)
})

test('?data= takes a bare MsaView snapshot, as docs/layers.md writes it', () => {
  const app = createApp(
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

test('?data= takes the shorthand expandSpec reads', () => {
  const app = createApp(
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

test('a malformed shorthand opens on an error naming it', () => {
  const app = createApp(JSON.stringify({ type: 'MsaView', msa, region: 'x' }))
  expect(String(app.msaview.error)).toMatch(/region "x"/)
})

test.each([
  ['unparsable JSON', '{"type":"MsaView",'],
  ['an object that is not a view', '{"data":{"msa":">a\\nA"}}'],
  [
    'a snapshot the model rejects',
    '{"msaview":{"type":"MsaView","height":"tall"}}',
  ],
])('?data= with %s opens on an error', (_, param) => {
  const app = createApp(param)
  expect(String(app.msaview.error)).toMatch(/\?data= parameter/)
})
