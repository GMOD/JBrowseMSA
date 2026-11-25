import { autorun } from 'mobx'
import { expect, test, vi } from 'vitest'

import { featureColorMap } from './featurePanels.ts'
import stateModelFactory from './model.ts'

import type { Annotation } from './types.ts'

const msa = '>a\nACGTACGT\n>b\nACGTACGT\n>c\nACGTACGT\n'

const call = (id: string, start: number, probability: number): Annotation => ({
  id,
  accession: '5mC',
  name: '5mC',
  description: '',
  start,
  end: start,
  attributes: { probability: String(probability) },
})

function makeModel() {
  const model = stateModelFactory().create({ type: 'MsaView', data: { msa } })
  model.setAnnotations([call('a', 2, 10), call('b', 3, 90), call('c', 5, 50)])
  model.setEncodings([
    {
      channel: 'featureFill',
      field: 'probability',
      scale: {
        type: 'linear',
        domainMin: 0,
        domainMax: 100,
        range: ['#0000ff', '#ff0000'],
      },
    },
    { channel: 'tipLabel', field: 'order' },
  ])
  return model
}

test('a change of the row table or the row order keeps the feature colors and bands', () => {
  const model = makeModel()
  const drawn: unknown[] = []
  const dispose = autorun(() => {
    drawn.push([model.featureColors, model.domainBands])
  })
  model.setRowData({ a: { order: '3' }, b: { order: '1' }, c: { order: '2' } })
  model.setRowTransform({ sort: [{ field: 'order' }] })
  expect(model.rowNames).toEqual(['b', 'c', 'a'])
  model.setRowTransform({ sort: [{ field: 'order', order: 'descending' }] })
  expect(model.rowNames).toEqual(['a', 'c', 'b'])
  dispose()
  expect(drawn).toHaveLength(1)
})

test('a row-table encoding still follows the row table', () => {
  const model = makeModel()
  model.setRowData({ a: { order: '1' }, b: { order: '2' } })
  const before = model.resolvedEncodings.find(e => e.channel === 'tipLabel')
  model.setRowData({ a: { order: '1' }, b: { order: '5' } })
  const after = model.resolvedEncodings.find(e => e.channel === 'tipLabel')
  expect(after?.items.map(i => i.value)).not.toEqual(
    before?.items.map(i => i.value),
  )
})

test('the feature colors read each field value through the scale once', () => {
  const colorOf = vi.fn((value: string | undefined) => `#${value}`)
  const annotations = [call('a', 1, 10), call('a', 2, 10), call('b', 1, 20)]
  const colors = featureColorMap(
    annotations,
    { field: 'probability', colorOf },
    () => '#000',
  )
  expect([...colors.values()].map(c => c.fill)).toEqual(['#10', '#10', '#20'])
  expect(colorOf).toHaveBeenCalledTimes(2)
})
