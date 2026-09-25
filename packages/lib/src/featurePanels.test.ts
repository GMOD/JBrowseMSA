// @vitest-environment jsdom
//
// A `features` row panel: the GFF's spans per row in a column of their own,
// over the alignment's columns or over each row's residue positions.
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

import type { ResolvedFeaturePanel, RowPanelSpec } from './types.ts'

const tree = '((g1:0.1,g2:0.1):0.2,g3:0.3);'

// g1 and g2 carry genE, g3 does not; g3's gene runs the other way
const gff = `##gff-version 3
g1\tncbi\tgene\t1\t500\t.\t+\t.\tName=genA;class=core
g1\tncbi\tgene\t600\t1000\t.\t+\t.\tName=genE;class=core
g2\tncbi\tgene\t200\t700\t.\t+\t.\tName=genE;class=core
g3\tncbi\tgene\t1\t400\t.\t-\t.\tName=genA;class=accessory`

function makeModel(rowPanels: RowPanelSpec[], data: Record<string, string>) {
  const model = MSAModelF().create({
    id: 'features-panel-test',
    type: 'MsaView',
    msaFormat: 'fasta',
    data,
    rowPanels,
  })
  model.setWidth(800)
  return model
}

function featurePanel(
  rowPanels: RowPanelSpec[],
  data: Record<string, string> = { tree, gff },
) {
  const model = makeModel(rowPanels, data)
  return {
    model,
    panel: model.resolvedRowPanels[0] as ResolvedFeaturePanel,
  }
}

// the span of the feature named `name` in row `row`
function span(panel: ResolvedFeaturePanel, row: string, name: string) {
  return panel.spans
    .get(row)!
    .find(s => s.annotation.attributes?.Name === name)!
}

test('a tree and a GFF with no alignment give the panel its x', () => {
  const { model, panel } = featurePanel([
    { kind: 'features', x: 'position', width: 201 },
  ])
  expect(model.numColumns).toBe(0)
  expect(model.dataInitialized).toBe(true)
  // the conservation, logo and ruler tracks all read columns, so none draws
  expect(model.tracks).toEqual([])
  expect([...panel.spans.keys()]).toEqual(['g1', 'g2', 'g3'])

  // the extent runs 0..1000 over 200 drawable pixels, the panel less the pixel
  // its rightmost stroke needs
  expect(model.rowHeight).toBe(16)
  expect(span(panel, 'g1', 'genA').xStart).toBe(0)
  expect(span(panel, 'g1', 'genA').xEnd).toBe(100)
  expect(span(panel, 'g1', 'genE').xStart).toBeCloseTo(119.8)
  expect(span(panel, 'g2', 'genE').xEnd).toBe(140)
})

test('align puts the named gene at one x, and a row lacking it keeps its origin', () => {
  const { model, panel } = featurePanel([
    {
      kind: 'features',
      x: 'position',
      width: 201,
      transform: [{ type: 'align', on: 'genE' }],
    },
  ])
  // genE starts at 600 in g1 and at 200 in g2, so the shift is 1 - start
  expect([...model.featureAlignShifts.get('genE')!]).toEqual([
    ['g1', -599],
    ['g2', -199],
  ])

  expect(span(panel, 'g1', 'genE').xStart).toBe(
    span(panel, 'g2', 'genE').xStart,
  )
  // g3 carries no genE, so its genA stays where an unshifted row puts it,
  // which after the shift is the leftmost x of the panel
  expect(span(panel, 'g3', 'genA').xStart).toBe(
    span(panel, 'g1', 'genA').xStart + 599 * (200 / 1100),
  )
  expect(Math.min(...[...panel.spans.values()].flat().map(s => s.xStart))).toBe(
    0,
  )
})

test('an align transform over a column panel draws nothing different', () => {
  const msa = '>g1\nMKAANSE\n>g2\nMKAANSE\n>g3\nMKAANSE'
  const aligned = featurePanel(
    [
      {
        kind: 'features',
        x: 'column',
        transform: [{ type: 'align', on: 'genE' }],
      },
    ],
    { tree, gff: 'g1\tncbi\tgene\t1\t3\t.\t+\t.\tName=genE', msa },
  )
  const plain = featurePanel([{ kind: 'features', x: 'column' }], {
    tree,
    gff: 'g1\tncbi\tgene\t1\t3\t.\t+\t.\tName=genE',
    msa,
  })
  expect(aligned.model.featureAlignShifts.size).toBe(0)
  expect(span(aligned.panel, 'g1', 'genE').xStart).toBe(
    span(plain.panel, 'g1', 'genE').xStart,
  )
  // a column panel draws the bands at the alignment's column width
  expect(span(plain.panel, 'g1', 'genE').xEnd).toBe(3 * plain.model.colWidth)
})

test('the panel colors its spans by its own field, and lists that scale', () => {
  const { model, panel } = featurePanel([
    {
      kind: 'features',
      x: 'position',
      encoding: {
        color: { field: 'class', scale: { map: { core: '#e41a1c' } } },
        label: 'Name',
      },
    },
  ])
  expect(panel.field).toBe('class')
  expect(panel.colors.get(span(panel, 'g1', 'genA').annotation)!.fill).toBe(
    '#e41a1c',
  )
  expect(panel.labels!.get(span(panel, 'g3', 'genA').annotation)).toBe('genA')
  // with no columns the overlay draws nothing and lists nothing, so the
  // panel's own scale is the whole key
  expect(model.legends.map(l => [l.title, l.entries.map(e => e.id)])).toEqual([
    ['class', ['core']],
  ])
})

test('hiding a feature type leaves the panel colors of the rest as they were', () => {
  const { model } = featurePanel([
    {
      kind: 'features',
      x: 'position',
      encoding: { color: { field: 'class' } },
    },
  ])
  model.setFilter('genA', false)

  const panel = model.resolvedRowPanels[0] as ResolvedFeaturePanel
  expect(panel.colors.get(span(panel, 'g1', 'genE').annotation)!.fill).toBe(
    '#00BFC4',
  )
  expect(panel.legend.map(e => e.id)).toEqual(['core'])
})

test('a panel taking the overlay colors lists them under the domain key', () => {
  const { model } = featurePanel([{ kind: 'features', x: 'position' }])
  expect(
    model.legends.map(l => [l.id, l.title, l.entries.map(e => e.id)]),
  ).toEqual([['domains', 'Domains', ['genA', 'genE']]])
})

test('the panel falls back to the top-level encoding, sharing its legend', () => {
  const msa = '>g1\nMKAANSE\n>g2\nMKAANSE\n>g3\nMKAANSE'
  const { model, panel } = featurePanel([{ kind: 'features', x: 'position' }], {
    tree,
    gff,
    msa,
  })
  model.setEncodings([
    { channel: 'featureFill', field: 'class', scale: { palette: 'set1' } },
  ])
  const resolved = model.resolvedRowPanels[0] as ResolvedFeaturePanel
  expect(resolved.field).toBe('class')
  // the overlay and the panel read one scale over one field, so the figure
  // lists it once
  expect(model.legends.map(l => [l.id, l.title])).toEqual([
    ['domains', 'class'],
  ])
  expect(resolved.colors.get(span(panel, 'g1', 'genA').annotation)!.fill).toBe(
    model.featureColors.get(span(panel, 'g1', 'genA').annotation)!.fill,
  )
})

test('a features panel is wider than a strip until it says otherwise', () => {
  const { model } = featurePanel([
    { kind: 'features', x: 'position' },
    { kind: 'features', x: 'position', width: 40, header: 'neighborhood' },
  ])
  expect(model.resolvedRowPanels.map(p => [p.width, p.offsetX])).toEqual([
    [200, 0],
    [40, 200],
  ])
  expect(model.rowPanelsWidth).toBe(240)
  expect(model.resolvedRowPanels.map(p => p.header)).toEqual([
    '',
    'neighborhood',
  ])
})

test('overlapping features in a row stack into lanes', () => {
  const { panel } = featurePanel([{ kind: 'features', x: 'position' }], {
    tree,
    gff: `##gff-version 3
g1\tncbi\tgene\t1\t500\t.\t+\t.\tName=genA
g1\tncbi\tgene\t100\t400\t.\t+\t.\tName=genB
g2\tncbi\tgene\t1\t500\t.\t+\t.\tName=genA`,
  })
  expect(panel.spans.get('g1')!.map(s => [s.lane, s.laneCount])).toEqual([
    [0, 2],
    [1, 2],
  ])
  expect(panel.spans.get('g2')!.map(s => [s.lane, s.laneCount])).toEqual([
    [0, 1],
  ])
})

test('strandpile puts the forward genes above the reverse ones', () => {
  // g1 runs an operon one way with one gene coming back at it; g2 is all
  // forward, g3 all reverse
  const { panel } = featurePanel(
    [{ kind: 'features', x: 'position', position: 'strandpile' }],
    {
      tree,
      gff: `##gff-version 3
g1\tncbi\tgene\t1\t500\t.\t+\t.\tName=genA
g1\tncbi\tgene\t520\t900\t.\t+\t.\tName=genB
g1\tncbi\tgene\t300\t800\t.\t-\t.\tName=genR
g2\tncbi\tgene\t1\t500\t.\t+\t.\tName=genA
g3\tncbi\tgene\t1\t500\t.\t-\t.\tName=genR`,
    },
  )
  const lanes = (row: string) =>
    Object.fromEntries(
      panel.spans
        .get(row)!
        .map(s => [s.annotation.attributes!.Name, [s.lane, s.laneCount]]),
    )
  // one lane each side, so the line between the strands sits halfway down
  // every row of the panel, including the rows using only one side
  expect(lanes('g1')).toEqual({ genA: [0, 2], genB: [0, 2], genR: [1, 2] })
  expect(lanes('g2')).toEqual({ genA: [0, 2] })
  expect(lanes('g3')).toEqual({ genR: [1, 2] })
})

test('strandpile stacks within a strand, keeping the other side its own', () => {
  // two forward genes overlap, so the forward side needs two lanes and the
  // reverse side drops below both
  const { panel } = featurePanel(
    [{ kind: 'features', x: 'position', position: 'strandpile' }],
    {
      tree,
      gff: `##gff-version 3
g1\tncbi\tgene\t1\t1000\t.\t+\t.\tName=genA
g1\tncbi\tgene\t100\t900\t.\t+\t.\tName=genB
g1\tncbi\tgene\t200\t800\t.\t-\t.\tName=genR`,
    },
  )
  expect(
    Object.fromEntries(
      panel.spans
        .get('g1')!
        .map(s => [s.annotation.attributes!.Name, [s.lane, s.laneCount]]),
    ),
  ).toEqual({ genA: [1, 3], genB: [0, 3], genR: [2, 3] })
})

test('genes sharing a few bases stay in one lane', () => {
  // trpE and trpD of E. coli share one base, and genD covers 200 bases of
  // genC, a fifth of it
  const { panel } = featurePanel([{ kind: 'features', x: 'position' }], {
    tree,
    gff: `##gff-version 3
g1\tncbi\tgene\t1\t1563\t.\t+\t.\tName=trpE
g1\tncbi\tgene\t1563\t3158\t.\t+\t.\tName=trpD
g2\tncbi\tgene\t1\t1000\t.\t+\t.\tName=genC
g2\tncbi\tgene\t801\t2000\t.\t+\t.\tName=genD`,
  })
  expect(panel.spans.get('g1')!.map(s => [s.lane, s.laneCount])).toEqual([
    [0, 1],
    [0, 1],
  ])
  expect(panel.spans.get('g2')!.map(s => [s.lane, s.laneCount])).toEqual([
    [0, 2],
    [1, 2],
  ])
})
