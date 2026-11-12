// Letter-color mode next to the domain overlay. A filled domain box owns the
// same pixels the color scheme wants, so the two settings have to divide them:
// the overlay drops to a bar under the row and the letters take the scheme.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import { domainUnderlineHeight } from '../../constants.ts'
import stateModelFactory from '../../model.ts'
import { contrastTextFn } from '../../util.ts'
import { colorSchemeMenuItems } from '../header/colorSchemeMenuItems.ts'
import { colorSettingsItems } from '../header/menuBarItems.ts'
import { renderBoxFeatureCanvasBlock } from './renderBoxFeatureCanvasBlock.ts'
import { renderMSABlock } from './renderMSABlock.ts'

import type { RenderCtx } from '../renderCtx.ts'

const row = 'ACDEFGHIKLMNPQRSTVWY'.repeat(3)
const msa = `>human\n${row}\n>mouse\n${row}`
const gff = `##gff-version 3
human	src	Domain	1	30	.	.	.	ID=d1;Name=Kinase;Ontology_term=IPR000001`

function makeModel() {
  const model = stateModelFactory().create({ type: 'MsaView', data: { msa } })
  model.setWidth(1000)
  model.applyGFFText(gff)
  return model
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
  fill: string
}

function recordingCtx() {
  const rects: Rect[] = []
  const letters: { text: string; fill: string }[] = []
  let fillStyle = '#000'
  const ctx = {
    font: '12px sans-serif',
    strokeStyle: '#000',
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
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    measureText: (text: string) => ({ width: text.length * 6 }),
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push({ x, y, w, h, fill: fillStyle })
    },
    strokeRect() {},
    fillText(text: string) {
      letters.push({ text, fill: fillStyle })
    },
  } as unknown as RenderCtx
  return { ctx, rects, letters }
}

function drawOverlay(model: ReturnType<typeof makeModel>) {
  const { ctx, rects } = recordingCtx()
  renderBoxFeatureCanvasBlock({
    model,
    ctx,
    theme: createJBrowseTheme(),
    offsetX: 0,
    offsetY: 0,
  })
  return rects
}

function drawLetters(model: ReturnType<typeof makeModel>) {
  const { ctx, letters } = recordingCtx()
  renderMSABlock({
    model,
    ctx,
    theme: createJBrowseTheme(),
    offsetX: 0,
    offsetY: 0,
  })
  return letters
}

test('the overlay fills the row when the background carries the color scheme', () => {
  const model = makeModel()
  expect(model.domainUnderline).toBe(false)

  const boxes = drawOverlay(model)
  expect(boxes).not.toHaveLength(0)
  expect(boxes.every(r => r.h === model.rowHeight)).toBe(true)
})

test('letter-color mode shrinks the overlay to a bar under the row', () => {
  const boxes = drawOverlay(makeModel())
  const model = makeModel()
  model.setCellFill('none')
  expect(model.domainUnderline).toBe(true)

  const bars = drawOverlay(model)
  expect(bars).toHaveLength(boxes.length)
  bars.forEach((bar, i) => {
    const box = boxes[i]!
    expect(bar.h).toBe(domainUnderlineHeight)
    expect([bar.x, bar.w, bar.fill]).toEqual([box.x, box.w, box.fill])
    // flush with the bottom of the box it replaces
    expect(bar.y + bar.h).toBe(box.y + box.h)
  })
})

test('letters under a domain take the color scheme, not a contrast color', () => {
  const model = makeModel()
  model.setCellFill('none')

  const letters = drawLetters(model)
  expect(letters).not.toHaveLength(0)
  // the scheme gives each residue its own hue, so the covered columns are not
  // one flat contrast color
  expect(new Set(letters.map(l => l.fill)).size).toBeGreaterThan(5)
})

test('sub-row layout keeps its stacked boxes and still colors the letters', () => {
  const model = makeModel()
  model.setCellFill('none')
  model.setSubFeatureRows(true)
  expect(model.domainUnderline).toBe(false)

  expect(drawOverlay(model).every(r => r.h < model.rowHeight)).toBe(true)
  expect(new Set(drawLetters(model).map(l => l.fill)).size).toBeGreaterThan(5)
})

test('with the letters too small to draw, the overlay keeps its filled boxes', () => {
  const model = makeModel()
  model.setCellFill('none')
  model.setRowHeight(3)
  model.setColWidth(2)
  expect(model.showMsaLetters).toBe(false)
  expect(model.domainUnderline).toBe(false)

  expect(drawOverlay(model).every(r => r.h === model.rowHeight)).toBe(true)
})

test('letters over a box contrast against the color the box was painted', () => {
  // a GFF color= overrides the accession palette, so the letters read the
  // resolved fill the overlay used, which here is black
  const model = makeModel()
  model.applyGFFText(`${gff};color=#000000`)
  expect(model.featureColors.values().next().value?.fill).toBe('#000000')
  expect(model.fillPalette.IPR000001).not.toBe('#000000')

  const theme = createJBrowseTheme()
  const covered = drawLetters(model).slice(0, 30)
  expect(covered).toHaveLength(30)
  expect(new Set(covered.map(l => l.fill))).toEqual(
    new Set([contrastTextFn(theme)('#000000')]),
  )
})

test('residue fill keeps the scheme in the cells and draws domains as a bar', () => {
  const model = makeModel()
  expect(model.cellFill).toBe('domain')
  model.setCellFill('residue')
  expect([model.cellFill, model.domainUnderline]).toEqual(['residue', true])
  // each bar comes with a strip of the page background above it, which parts
  // it from the residue colors
  const marks = drawOverlay(model)
  const bars = marks.filter(r => r.h === domainUnderlineHeight)
  const halos = marks.filter(r => r.h > domainUnderlineHeight)
  expect(bars).not.toHaveLength(0)
  expect(halos).toHaveLength(bars.length)
  expect(halos.every(r => r.h < model.rowHeight)).toBe(true)
  const { ctx, rects } = recordingCtx()
  renderMSABlock({
    model,
    ctx,
    theme: createJBrowseTheme(),
    offsetX: 0,
    offsetY: 0,
  })
  // jsdom has no raster, so renderMSABlock paints each residue's cell
  expect(new Set(rects.map(r => r.fill)).size).toBeGreaterThan(5)
})

test('the cell fill travels in the snapshot only off its default', () => {
  const model = makeModel()
  expect(JSON.stringify(getSnapshot(model))).not.toContain('residueColor')
  model.setCellFill('residue')
  expect(getSnapshot(model).residueColor).toEqual({ field: 'residue' })
  model.setCellFill('none')
  expect(model.cellFill).toBe('none')
  model.setCellFill('domain')
  expect(model.cellFill).toBe('domain')
  expect(JSON.stringify(getSnapshot(model))).not.toContain('residueColor')
})

test('picking a scheme while the domains fill the cells hands them back', () => {
  const model = makeModel()
  const clustal = colorSchemeMenuItems(model).find(
    item => 'label' in item && item.label === 'Clustal X',
  )
  if (clustal && 'onClick' in clustal) {
    clustal.onClick()
  }
  expect([model.resolvedResidueColor.scheme, model.cellFill]).toEqual([
    'clustalx_protein',
    'residue',
  ])
})

test('the settings check Domains or a scheme, never both', () => {
  const model = makeModel()
  const checked = () =>
    colorSettingsItems(model)
      .filter(item => 'checked' in item && item.checked)
      .map(item => 'label' in item && item.label)
  expect(checked()).toEqual(['Domains'])
  model.setCellFill('residue')
  expect(checked()).toEqual(['MAEditor'])
  model.setCellFill('none')
  expect(checked()).toEqual(['MAEditor', 'Color the letters, not the cells'])
})

test('sub-row boxes over residue colors sit under the letters', () => {
  const model = makeModel()
  model.setCellFill('residue')
  model.setSubFeatureRows(true)
  const ops: string[] = []
  const { ctx } = recordingCtx()
  const logged = {
    ...ctx,
    fill: () => ops.push('fill'),
    fillRect: () => ops.push('fill'),
    fillText: () => ops.push('text'),
  } as unknown as RenderCtx
  renderMSABlock({
    model,
    ctx: logged,
    theme: createJBrowseTheme(),
    offsetX: 0,
    offsetY: 0,
    domains: true,
  })
  const firstText = ops.indexOf('text')
  expect(firstText).toBeGreaterThan(0)
  expect(ops.lastIndexOf('fill')).toBeLessThan(firstText)
})
