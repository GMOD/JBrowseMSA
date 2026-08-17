import { expect, test } from 'vitest'

import stateModelFactory from '../../model.ts'
import { renderBoxFeatureCanvasBlock } from './renderBoxFeatureCanvasBlock.ts'

import type { RenderCtx } from '../renderCtx.ts'

const row = 'ACDEFGHIKLMNPQRSTVWY'.repeat(3)

// only `human` carries the gene model; `mouse` is there to push it off the top
// of the block
const msa = `>mouse\n${row}\n>human\n${row}`

const gff = `##gff-version 3
human	src	exon	1	20	.	.	.	ID=human.exon1;Name=exon-1
human	src	exon	21	40	.	.	.	ID=human.exon2;Name=exon-2
human	src	exon	41	60	.	.	.	ID=human.exon3;Name=exon-3`

function drawnLabels() {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa },
  })
  model.setWidth(1000)
  model.setRowHeight(20)
  // segment numbers are drawn in place of residue letters, never on top of them
  model.setDrawMsaLetters(false)
  model.applyGFFText(gff)
  expect(model.rowNames).toEqual(['mouse', 'human'])

  const labels: string[] = []
  const ctx = {
    font: '12px sans-serif',
    resetTransform() {},
    scale() {},
    translate() {},
    fillRect() {},
    strokeRect() {},
    measureText: (text: string) => ({ width: text.length * 6 }),
    fillText(text: string) {
      labels.push(text)
    },
  } as unknown as RenderCtx

  renderBoxFeatureCanvasBlock({ model, ctx, offsetX: 0, offsetY: 0 })
  return labels
}

test('segment numbers are drawn once each, even when row 0 has no gene model', () => {
  expect(drawnLabels()).toEqual(['1', '2', '3'])
})
