// @vitest-environment jsdom
//
// The two tree channels: `nodePoint` fills each internal node's bubble from
// its support value, the label Newick writes after the node's closing paren,
// and `rowLabel` names the rowData field each tip label draws, with `genome`
// read where no encoding names one.
import { preorder } from '@gmod/newick'
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import { createTestModel, installSvgTestEnv } from './svgTestUtil.ts'

import type { MsaViewModel } from './model.ts'
import type { Encoding } from './types.ts'

const msa = `>human
ACDEFGHIKL
>mouse
ACDEFGHIKL
>chicken
ACDEFGHIKL
>duck
ACDEFGHIKL`

const tree = '((human:0.1,mouse:0.1)95:0.2,(chicken:0.3,duck:0.3)40:0.1);'

const rowData = {
  human: { strain: 'Homo sapiens', genome: 'GRCh38' },
  mouse: { genome: 'GRCm39' },
}

const support: Encoding = {
  channel: 'nodePoint',
  field: 'support',
  scale: { type: 'threshold', domain: [70], range: ['#d73027', '#1a9850'] },
}

function makeModel(encodings: Encoding[]) {
  return createTestModel({
    id: 'tree-channels-test',
    data: { msa, tree, treeMetadata: JSON.stringify(rowData) },
    encodings,
  })
}

function exportSvg(model: MsaViewModel) {
  installSvgTestEnv()
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })
}

// the fill per node, keyed by the node's label
function supportColors(model: MsaViewModel) {
  const names = new Map(preorder(model.tree).map(node => [node.id, node.name]))
  return Object.fromEntries(
    [...(model.nodePointColors ?? [])].map(
      ([id, color]) => [names.get(id) ?? id, color] as const,
    ),
  )
}

test('nodePoint colors each labelled internal node through its scale', () => {
  const model = makeModel([support])
  expect(supportColors(model)).toEqual({ '95': '#1a9850', '40': '#d73027' })
  expect(model.legends).toEqual([
    {
      id: 'rowData-support',
      title: 'support',
      items: [
        { value: '< 70', label: '< 70', color: '#d73027' },
        { value: '≥ 70', label: '≥ 70', color: '#1a9850' },
      ],
    },
  ])
})

test('no nodePoint encoding leaves every bubble plain', () => {
  expect(makeModel([]).nodePointColors).toBeUndefined()
})

test('the export fills the bubbles in the scale colors', async () => {
  const svg = await exportSvg(makeModel([support]))
  expect(svg).toContain('fill="#1a9850"')
  expect(svg).toContain('fill="#d73027"')
})

test('a hidden support value leaves its bubble plain', () => {
  const model = makeModel([{ channel: 'nodePoint', field: 'support' }])
  const section = model.legends[0]!
  expect(section.hides).toEqual({ kind: 'category', fields: ['support'] })
  model.toggleLegendItem(section.hides!, '95')

  expect(Object.keys(supportColors(model))).toEqual(['40'])
  expect(getSnapshot(model).hiddenCategories).toEqual([
    { field: 'support', value: '95' },
  ])
})

test('the tip labels read genome where no rowLabel encoding names a field', () => {
  const model = makeModel([])
  expect(model.rowLabelField).toBe('genome')
  expect(model.rowLabelOf('human')).toBe('GRCh38')
  expect(model.rowLabelOf('chicken')).toBe('chicken')
})

test('rowLabel names the field the tip labels draw, else the row name', async () => {
  const model = makeModel([{ channel: 'rowLabel', field: 'strain' }])
  expect(model.rowLabelOf('human')).toBe('Homo sapiens')
  expect(model.rowLabelOf('mouse')).toBe('mouse')

  const svg = await exportSvg(model)
  expect(svg).toContain('>Homo sapiens</text>')
  expect(svg).not.toContain('GRCh38')
})

test('node support reads the labelled internal nodes, so no tip counts as missing', () => {
  const model = makeModel([
    { ...support, legend: { title: 'support', missingLabel: 'no support' } },
  ])
  const legend = model.legends.find(l => l.title === 'support')!
  expect(legend.items.map(item => item.label)).not.toContain('no support')
})
