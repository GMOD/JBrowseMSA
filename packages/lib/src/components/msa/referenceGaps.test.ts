import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { expect, test } from 'vitest'

import stateModelFactory from '../../model.ts'
import { renderMSABlock } from './renderMSABlock.ts'

import type { RenderCtx } from '../renderCtx.ts'

const theme = createJBrowseTheme()
const wash = theme.palette.action.hover
const background = theme.palette.background.default

const msa = [
  '>ref\nAC-GT',
  '>spans\nAC-GT',
  '>carries\nACAGT',
  '>absent\n.....',
  '>deletion\nA--GT',
].join('\n')

function drawCells() {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa },
    relativeTo: 'ref',
    residueColor: { field: 'residue' },
  })
  model.setWidth(800)
  model.setColWidth(20)
  model.setRowHeight(20)
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

test('a residue matching the reference draws a dot on the match wash', () => {
  expect(drawCells()('spans', 1)).toEqual({ tile: wash, text: '.' })
})

test('reading down a reference gap column tells spanning, carrying and absent rows apart', () => {
  const cell = drawCells()
  expect(cell('spans', 2)).toEqual({ tile: wash, text: '-' })
  expect(cell('carries', 2)?.text).toBe('A')
  expect(cell('absent', 2)).toEqual({ tile: background, text: '.' })
})

test('a deletion under a reference residue keeps its gap', () => {
  expect(drawCells()('deletion', 1)).toEqual({ tile: background, text: '-' })
})
