// @vitest-environment jsdom
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import { installHeadlessRenderEnv } from './headlessRenderEnv.ts'
import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'

import type { ColumnTrackSpec } from './types.ts'

beforeAll(() => {
  enableStaticRendering(true)
  installHeadlessRenderEnv()
})

const msa = '>s1\nACGTACGT\n>s2\nACGTACGT\n'
const colWidth = 20
const arcColor = '#123456'

function makeModel(columnTracks: ColumnTrackSpec[]) {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    colWidth,
    data: { msa },
    columnTracks,
  })
  model.setWidth(1000)
  model.toggleTrack('conservation')
  return model
}

async function exportSvg(model: ReturnType<typeof makeModel>) {
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeTracks: true,
  })
}

function pathsStroked(svg: string, stroke: string) {
  return [...svg.matchAll(/<path ([^>]*)\/?>/g)]
    .map(m => m[1]!)
    .filter(attrs => attrs.includes(`stroke="${stroke}"`))
    .map(attrs => /d="([^"]*)"/.exec(attrs)?.[1] ?? '')
}

test('an arc track exports one quadratic path per pair', async () => {
  const model = makeModel([
    {
      id: 'contacts',
      name: 'Contacts',
      kind: 'arc',
      arcs: [
        { start: 1, end: 8 },
        { start: 3, end: 6 },
      ],
      color: arcColor,
    },
  ])
  const paths = pathsStroked(await exportSvg(model), arcColor)
  expect(paths).toHaveLength(2)
  // feet at the center of columns 1 and 8, apex between them
  const [x1, x2] = [0.5 * colWidth, 7.5 * colWidth]
  expect(paths[0]).toContain(`M ${x1}`)
  expect(paths[0]).toContain(`${x2}`)
  // the longer pair reaches higher: a smaller y is further up the track
  const apexY = (d: string) => Number(/Q [\d.-]+ ([\d.-]+)/.exec(d)?.[1])
  expect(apexY(paths[0]!)).toBeLessThan(apexY(paths[1]!))
})

test('a per-arc color overrides the track color', async () => {
  const model = makeModel([
    {
      id: 'contacts',
      name: 'Contacts',
      kind: 'arc',
      arcs: [
        { start: 1, end: 8 },
        { start: 2, end: 7, color: '#abcdef' },
      ],
      color: arcColor,
    },
  ])
  const svg = await exportSvg(model)
  expect(pathsStroked(svg, arcColor)).toHaveLength(1)
  expect(pathsStroked(svg, '#abcdef')).toHaveLength(1)
})

test('a Stockholm SS_cons exports its base pairs without any spec', async () => {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'stockholm',
    height: 400,
    colWidth,
    data: {
      msa: `# STOCKHOLM 1.0
s1 GGGAAACCCUUU
s2 GGGAAACCCUUU
#=GC SS_cons <<<AAA>>>aaa
//
`,
    },
  })
  model.setWidth(1000)
  const svg = await exportSvg(model)
  // three nested pairs in one color, three pseudoknot pairs in another
  const arcs = [...svg.matchAll(/<path [^>]*stroke="(#[0-9a-f]{6})"[^>]*\/?>/g)]
  const byColor = new Map<string, number>()
  for (const m of arcs) {
    byColor.set(m[1]!, (byColor.get(m[1]!) ?? 0) + 1)
  }
  expect([...byColor.values()].filter(n => n === 3)).toHaveLength(2)
})
