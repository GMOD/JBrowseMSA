import { getSnapshot, types } from '@jbrowse/mobx-state-tree'
import { afterEach, expect, test } from 'vitest'

import { stripDefault } from './stripDefault.ts'

const real = types.stripDefault

afterEach(() => {
  types.stripDefault = real
})

test('strips defaults from the snapshot when the host mst supports it', () => {
  const model = types
    .model({ a: stripDefault(types.boolean, false) })
    .create({})
  expect(model.a).toBe(false)
  expect(getSnapshot(model).a).toBeUndefined()
})

// The path that actually runs inside every RELEASED jbrowse-web: the host
// supplies its own mobx-state-tree, and stripDefault only exists in the copy
// that ships with unreleased @jbrowse/core. Calling it there used to throw while
// the model was built, which error-paged the whole app. dev has the API, so
// without stubbing it away this path is never exercised.
test('falls back to types.optional when the host mst lacks stripDefault', () => {
  // @ts-expect-error deleting it is the point: simulate an older host
  delete types.stripDefault
  const model = types
    .model({ a: stripDefault(types.boolean, false) })
    .create({})
  expect(model.a).toBe(false)
  // the only difference: the default is serialized rather than omitted
  expect(getSnapshot(model).a).toBe(false)
})

test('non-default values survive both paths', () => {
  const withApi = types
    .model({ a: stripDefault(types.number, 1) })
    .create({ a: 5 })
  expect(getSnapshot(withApi).a).toBe(5)

  // @ts-expect-error see above
  delete types.stripDefault
  const without = types
    .model({ a: stripDefault(types.number, 1) })
    .create({ a: 5 })
  expect(getSnapshot(without).a).toBe(5)
})
