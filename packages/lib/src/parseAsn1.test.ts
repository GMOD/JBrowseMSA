import { readFileSync } from 'node:fs'

import { expect, test } from 'vitest'

import { parseAsn1 } from './parseAsn1.ts'

const r = readFileSync(
  new URL('../test/data/tree.asn', import.meta.url),
  'utf8',
)

test('real data file', () => {
  expect(parseAsn1(r)).toMatchSnapshot()
})
