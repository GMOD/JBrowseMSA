import fs from 'fs'

import { expect, test } from 'vitest'

import { parseAsn1 } from './parseAsn1.ts'

const r = fs.readFileSync(require.resolve('../test/data/tree.asn'), 'utf8')

test('real data file', () => {
  expect(parseAsn1(r)).toMatchSnapshot()
})
