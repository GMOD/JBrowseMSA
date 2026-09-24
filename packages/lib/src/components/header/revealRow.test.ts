import { expect, test } from 'vitest'

import MSAModelF from '../../model.ts'
import { findableRowNames, revealRow } from './revealRow.ts'

const names = Array.from({ length: 200 }, (_, i) => `seq${i}`)

function makeModel(tree?: string) {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    data: { msa: names.map(n => `>${n}\nACGT`).join('\n'), tree },
  })
  model.setWidth(800)
  return model
}

test('revealing a row centers it and lights it', () => {
  const model = makeModel()
  revealRow(model, 'seq120')
  const { rowHeight, msaAreaHeight, scrollY } = model
  expect(120 * rowHeight + scrollY).toBeLessThan(msaAreaHeight / 2)
  expect(121 * rowHeight + scrollY).toBeGreaterThan(msaAreaHeight / 2)
  expect(model.mouseRow).toBe(120)
})

test('a row near either end scrolls only as far as the alignment goes', () => {
  const model = makeModel()
  revealRow(model, 'seq1')
  expect(model.scrollY).toBe(0)
  revealRow(model, 'seq199')
  expect(model.scrollY).toBe(model.maxScrollY)
  expect(model.mouseRow).toBe(199)
})

test('an unknown name leaves the view where it was', () => {
  const model = makeModel()
  revealRow(model, 'seq120')
  const { scrollY } = model
  revealRow(model, 'nope')
  expect(model.scrollY).toBe(scrollY)
})

test('a collapsed clade offers its named tips and not its path id', () => {
  const model = makeModel('((seq0,seq1),(seq2,seq3));')
  const clade = model.hierarchy.children![0]!.data.id
  model.toggleCollapsed(clade)
  const found = findableRowNames(model)
  expect(found).not.toContain(clade)
  expect(found).toContain('seq2')
  expect(found).not.toContain('seq0')
})
