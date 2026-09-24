import { expect, test } from 'vitest'

import MSAModelF from '../../model.ts'
import { findableRowNames, goTo } from './goTo.ts'

import type { MsaViewModel } from '../../model.ts'

const names = Array.from({ length: 200 }, (_, i) => `seq${i}`)

function makeModel(
  msa: string,
  { tree, relativeTo }: { tree?: string; relativeTo?: string } = {},
) {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    data: { msa, tree },
    relativeTo,
  })
  model.setWidth(800)
  return model
}

const tallModel = (tree?: string) =>
  makeModel(names.map(n => `>${n}\nACGT`).join('\n'), { tree })

// 600 columns; `gappy` starts at column 101, and `chr1:5` names a row
const wideMsa = [
  `>gappy\n${'-'.repeat(100)}${'A'.repeat(500)}`,
  `>other\n${'C'.repeat(600)}`,
  `>chr1:5\n${'G'.repeat(600)}`,
].join('\n')

function centered(model: MsaViewModel, col: number) {
  const { colWidth, scrollX, msaAreaWidth } = model
  return (
    col * colWidth + scrollX < msaAreaWidth / 2 &&
    (col + 1) * colWidth + scrollX > msaAreaWidth / 2
  )
}

test('a row name centers that row and lights it', () => {
  const model = tallModel()
  expect(goTo(model, 'seq120')).toBe(true)
  const { rowHeight, msaAreaHeight, scrollY } = model
  expect(120 * rowHeight + scrollY).toBeLessThan(msaAreaHeight / 2)
  expect(121 * rowHeight + scrollY).toBeGreaterThan(msaAreaHeight / 2)
  expect(model.mouseRow).toBe(120)
})

test('a row near either end scrolls only as far as the alignment goes', () => {
  const model = tallModel()
  goTo(model, 'seq1')
  expect(model.scrollY).toBe(0)
  goTo(model, 'seq199')
  expect(model.scrollY).toBe(model.maxScrollY)
  expect(model.mouseRow).toBe(199)
})

test('a number centers the column the ruler numbers that way', () => {
  const model = makeModel(wideMsa)
  expect(goTo(model, ' 300 ')).toBe(true)
  expect(centered(model, 299)).toBe(true)
  expect(model.mouseCol).toBe(299)
})

test('name:N centers residue N of that row and lights both', () => {
  const model = makeModel(wideMsa)
  expect(goTo(model, 'gappy:1')).toBe(true)
  expect(centered(model, 100)).toBe(true)
  expect(model.mouseCol).toBe(100)
  expect(model.mouseRow).toBe(model.rowNamesSet.get('gappy'))
})

test('with a reference row, a number is that row’s residue, as the ruler reads', () => {
  const model = makeModel(wideMsa, { relativeTo: 'gappy' })
  goTo(model, '1')
  expect(model.mouseCol).toBe(100)
})

test('a row whose name holds a colon is found by its name', () => {
  const model = makeModel(wideMsa)
  expect(goTo(model, 'chr1:5')).toBe(true)
  expect(model.mouseRow).toBe(model.rowNamesSet.get('chr1:5'))
  expect(model.mouseCol).toBeUndefined()
})

test('an entry that names nothing leaves the view where it was', () => {
  const model = makeModel(wideMsa)
  goTo(model, '300')
  const { scrollX, mouseCol } = model
  for (const text of ['nope', '0', '601', 'gappy:0', 'gappy:501', 'nope:3']) {
    expect({ text, found: goTo(model, text) }).toEqual({ text, found: false })
  }
  expect(model.scrollX).toBe(scrollX)
  expect(model.mouseCol).toBe(mouseCol)
})

test('a collapsed clade offers its named tips and not its path id', () => {
  const model = tallModel('((seq0,seq1),(seq2,seq3));')
  const clade = model.hierarchy.children![0]!.data.id
  model.toggleCollapsed(clade)
  const found = findableRowNames(model)
  expect(found).not.toContain(clade)
  expect(found).toContain('seq2')
  expect(found).not.toContain('seq0')
})
