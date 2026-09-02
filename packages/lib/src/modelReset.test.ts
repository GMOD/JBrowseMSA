// reset() returns the view to the import form, and the next file loads into
// the same model instance. It applies a default snapshot filtered to
// preservedOnReset, so anything file-derived that survived would be a hole in
// that list — the last test enumerates the snapshot keys to keep the list and
// the model's properties from drifting apart as properties are added. The
// stakes: node ids are path-derived (node-0-0-1), so a stale collapsed or
// showOnly id names a real node in the next tree and folds it.
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { describe, expect, test } from 'vitest'

import MSAModelF, { preservedOnReset } from './model.ts'

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

  test('clears file-derived volatiles', () => {
    const model = makeModel()
    model.setMousePos(2, 1)
    model.setMouseClickPos(3, 0)
    model.setHighlightedColumns([1, 2])
    model.setHoveredTreeNode(internalNodeId(model))

    model.reset()
    expect(model.mouseCol).toBe(undefined)
    expect(model.mouseClickCol).toBe(undefined)
    expect(model.highlightedColumns).toBe(undefined)
    expect(model.hoveredTreeNode).toBe(undefined)
    expect(model.error).toBe(undefined)
    expect(model.annotations).toEqual([])
  })

  test('display preferences survive', () => {
    const model = makeModel()
    model.setColorSchemeName('clustalx')
    model.setDrawNodeBubbles(false)
    model.toggleTrack('conservation')

    model.reset()
    expect(model.colorSchemeName).toBe('clustalx')
    expect(model.drawNodeBubbles).toBe(false)
    expect(model.turnedOffTracks.get('conservation')).toBe(true)
  })

  test('every property off preservedOnReset matches a fresh model', () => {
    const model = makeModel()
    model.toggleCollapsed(internalNodeId(model))
    model.setShowOnly(internalNodeId(model))
    model.drawRelativeTo('a')
    model.setFilter('PF00001', true)
    model.setScrollX(-100)
    model.setScrollY(-50)
    model.zoomIn()
    model.setCurrentAlignment(1)
    model.setMSAFilehandle({
      uri: 'http://x/msa.fa',
      locationType: 'UriLocation',
    })
    model.setTreeFilehandle({
      uri: 'http://x/t.nh',
      locationType: 'UriLocation',
    })
    model.setTreeMetadataFilehandle({
      uri: 'http://x/m.json',
      locationType: 'UriLocation',
    })
    model.setMSAFormat('fasta')

    model.reset()
    const fresh = MSAModelF().create({ type: 'MsaView' })
    const strip = (snap: object) =>
      Object.fromEntries(
        Object.entries(snap).filter(([key]) => !preservedOnReset.has(key)),
      )
    expect(strip(getSnapshot(model))).toEqual(strip(getSnapshot(fresh)))
  })
})
