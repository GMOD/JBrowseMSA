// reset() returns the view to the import form, and the next file loads into
// the same model instance. Node ids are path-derived (node-0-0-1), so any
// collapsed/showOnly id recorded against the previous tree names a real node
// in the next one — reset has to drop them or the new tree opens pre-folded.
import { describe, expect, test } from 'vitest'

import MSAModelF from './model.ts'

const firstFile = {
  msa: '>a\nACGT\n>b\nACGT\n>c\nACGT\n>d\nACGT',
  tree: '((a,b),(c,d));',
}
const secondFile = {
  msa: '>e\nTTTT\n>f\nTTTT\n>g\nTTTT\n>h\nTTTT',
  tree: '((e,f),(g,h));',
}

function makeModel() {
  const model = MSAModelF().create({ type: 'MsaView', data: firstFile })
  model.setWidth(800)
  return model
}

function internalNodeId(model: ReturnType<typeof makeModel>) {
  return model.leaves[0]!.parent!.data.id
}

describe('reset', () => {
  test('a collapsed clade does not fold the next loaded tree', () => {
    const model = makeModel()
    model.toggleCollapsed(internalNodeId(model))
    expect(model.leaves.length).toBe(3)

    model.reset()
    model.setData(secondFile)
    expect(model.collapsed.length).toBe(0)
    expect(model.leaves.map(l => l.data.name).toSorted()).toEqual([
      'e',
      'f',
      'g',
      'h',
    ])
  })

  test('showOnly does not restrict the next loaded tree', () => {
    const model = makeModel()
    model.setShowOnly(internalNodeId(model))
    expect(model.leaves.length).toBe(2)

    model.reset()
    model.setData(secondFile)
    expect(model.showOnly).toBe(undefined)
    expect(model.leaves.length).toBe(4)
  })

  test('clears relativeTo, featureFilters and the metadata filehandle', () => {
    const model = makeModel()
    model.drawRelativeTo('a')
    model.setFilter('PF00001', true)
    model.setTreeMetadataFilehandle({
      uri: 'http://example.com/meta.json',
      locationType: 'UriLocation',
    })

    model.reset()
    expect(model.relativeTo).toBe(undefined)
    expect(model.featureFilters.size).toBe(0)
    expect(model.treeMetadataFilehandle).toBe(undefined)
  })
})
