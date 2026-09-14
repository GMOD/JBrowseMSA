// @vitest-environment jsdom
//
// Collapsing a clade hides rows from display only; row lookups, residue
// mappings and neighbor joining still see them.
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

const msa = '>a\nMKAANSE\n>b\nMKA-NSE\n>c\nMKWWNSE\n>d\nMKWWNQE\n>e\nMKWWNQQ'
const tree = '((a:1,b:2):1,((c:1,d:3):1,e:1):1);'

function makeModel(extra: Record<string, unknown> = {}) {
  const model = MSAModelF().create({
    id: 'collapsed-rows-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa, tree },
    ...extra,
  })
  model.setWidth(800)
  return model
}

function collapseFirstClade(model: ReturnType<typeof makeModel>) {
  const clade = model.leaves.find(l => l.data.name === 'a')!.parent!
  model.toggleCollapsed(clade.data.id)
  expect(model.rowNames).not.toContain('a')
  return clade.data.id
}

test('a hidden row still has a sequence and coordinates', () => {
  const model = makeModel()
  const col = model.seqPosToGlobalCol('a', 3)
  collapseFirstClade(model)
  expect(model.rowMap.get('a')).toBe('MKAANSE')
  expect(model.seqPosToGlobalCol('a', 3)).toBe(col)
})

test('a hidden row keeps its residue mapping', () => {
  const model = makeModel({
    residueMappings: [
      {
        row: 'a',
        accession: 'P1',
        structure: { id: '1ABC', kind: 'experimental', asymId: 'A' },
        segments: [{ rowStart: 1, rowEnd: 7, structStart: 1, structEnd: 7 }],
      },
    ],
  })
  expect(model.residueMappingProblems).toEqual([])
  const residue = model.structureResidue('a', 2)
  expect(residue?.position).toBe(2)

  collapseFirstClade(model)

  expect(model.residueMappingProblems).toEqual([])
  expect(model.structureResidue('a', 2)?.position).toBe(2)
})

test('neighbor joining builds from the whole alignment', () => {
  const model = makeModel()
  const id = collapseFirstClade(model)

  model.calculateNeighborJoiningTreeFromMSA()

  expect(model.rowNames.toSorted()).toEqual(['a', 'b', 'c', 'd', 'e'])
  // the old tree's collapsed ids do not apply to the new tree
  expect([...model.collapsed]).toEqual([])
  expect(id).toBeTruthy()
})

test('switching alignments drops what named the old one', () => {
  const stockholm = `# STOCKHOLM 1.0
#=GF DE First
a MKAANSE
b MKA-NSE
//
# STOCKHOLM 1.0
#=GF DE Second
x MKWWNSE
y MKWWNQE
//
`
  const model = MSAModelF().create({
    id: 'multi-alignment-test',
    type: 'MsaView',
    data: { msa: stockholm },
  })
  model.setWidth(800)
  model.toggleCollapsed(model.leaves[0]!.parent!.data.id)
  model.drawRelativeTo('a')
  model.setScrollY(-10)

  model.setCurrentAlignment(1)

  expect([...model.collapsed]).toEqual([])
  expect(model.showOnly).toBeUndefined()
  expect(model.relativeTo).toBeUndefined()
  expect(model.scrollY).toBe(0)
  expect(model.rowNames.toSorted()).toEqual(['x', 'y'])
})
