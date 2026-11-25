// A JBrowse view model's `type` is its registered view type name, so a plugin
// composing MSAModelF() under its own name replaces the 'MsaView' literal.
// `MSAView` takes such a model as it is. The assertions are checked by the
// typecheck, which covers test files.
import { types } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

import type MSAView from './components/Loading.tsx'
import type { MsaViewModel } from './model.ts'
import type { ComponentProps } from 'react'

type MSAViewModelProp = ComponentProps<typeof MSAView>['model']

const TView = types.compose(
  'TView',
  MSAModelF(),
  types.model({ type: types.literal('TView') }),
)

test('a model composed under another view type name is an MSAView model', () => {
  const model = TView.create({ type: 'TView' })
  const prop: MSAViewModelProp = model
  expect(prop.type).toBe('TView')
})

test('the library model under its own name is one too', () => {
  const model: MSAViewModelProp = MSAModelF().create({ type: 'MsaView' })
  expect(model.type).toBe('MsaView')
})

test('an object that only carries a type is not', () => {
  // @ts-expect-error a `type` alone is not a view model
  const prop: MsaViewModel = { type: 'TView' }
  expect(prop.type).toBe('TView')
})
