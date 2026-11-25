import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { expect, test } from 'vitest'

import stateModelFactory from '../../model.ts'
import { consensusFill } from './consensusFill.ts'
import { renderMSABlock } from './renderMSABlock.ts'

import type { RenderCtx } from '../renderCtx.ts'

const theme = createJBrowseTheme()
const wash = theme.palette.action.hover
const tint = consensusFill(theme)

// column 2 is an insertion three rows share as A and one has as G; column 3 is
// a base only one row has
const msa = [
  '>ref\nAC--GT',
  '>one\nACA-GT',
  '>two\nACA-GT',
  '>three\nACATGT',
  '>odd\nACG-GT',
  '>spans\nAC--GT',
].join('\n')

function view(consensusInGaps: boolean) {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa },
    relativeTo: 'ref',
    residueColor: { field: 'residue' },
    consensusInGaps,
  })
  model.setWidth(800)
  model.setColWidth(20)
  model.setRowHeight(20)
  return model
}

function drawCells(consensusInGaps = true) {
  const model = view(consensusInGaps)
  const cells = new Map<string, { tile?: string; text?: string }>()
  const at = (x: number, y: number) => {
    const key = `${model.leaves[Math.floor((y + 10) / 20)]!.data.name}:${Math.floor(x / 20)}`
    const cell = cells.get(key) ?? {}
    cells.set(key, cell)
    return cell
  }
  let fillStyle = ''
  const ctx = {
    font: '',
    textAlign: 'center',
    textBaseline: 'alphabetic',
    get fillStyle() {
      return fillStyle
    },
    set fillStyle(arg: string) {
      fillStyle = arg
    },
    resetTransform() {},
    scale() {},
    translate() {},
    fillRect(x: number, y: number) {
      at(x, y).tile = fillStyle
    },
    fillText(text: string, x: number, y: number) {
      at(x, y - 10).text = text
    },
  } as unknown as RenderCtx
  renderMSABlock({ model, ctx, theme, offsetX: 0, offsetY: 0 })
  return (row: string, col: number) => cells.get(`${row}:${col}`)
}

test('the consensus is read only where the reference has a gap, and needs two rows and a majority', () => {
  expect(view(true).gapConsensus).toEqual(['', '', 'A', '', '', ''])
  expect(view(false).gapConsensus).toBeUndefined()
})

test('an inserted residue matching its column draws a dot on the insertion tint', () => {
  const cell = drawCells()
  expect(cell('one', 2)).toEqual({ tile: tint, text: '.' })
  expect(cell('three', 2)).toEqual({ tile: tint, text: '.' })
})

test('an inserted residue that differs keeps its letter and color', () => {
  const cell = drawCells()
  expect(cell('odd', 2)?.text).toBe('G')
  expect(cell('odd', 2)?.tile).not.toBe(tint)
  expect(cell('three', 3)?.text).toBe('T')
})

test('a gap and a reference match draw as before', () => {
  const cell = drawCells()
  expect(cell('spans', 2)).toEqual({ tile: wash, text: '-' })
  expect(cell('one', 0)).toEqual({ tile: wash, text: '.' })
})

test('off, every inserted residue keeps its letter', () => {
  expect(drawCells(false)('one', 2)?.text).toBe('A')
})

test('hiding gappy columns keeps the reference columns when asked to', () => {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa: '>ref\nA-C\n>a\n.-C\n>b\n.GC\n>c\n..C\n' },
    relativeTo: 'ref',
    hideGaps: true,
    allowedGappyness: 70,
  })
  expect(model.gappyColumns).toEqual([0, 1])
  model.setKeepReferenceColumns(true)
  expect(model.gappyColumns).toEqual([1])
})
