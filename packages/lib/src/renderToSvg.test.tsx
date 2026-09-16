// @vitest-environment jsdom
//
// Layout and palette of the exported figure itself, as opposed to what any one
// layer draws inside it.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import { renderToSvg } from './renderToSvg.tsx'
import {
  createTestModel,
  installSvgTestEnv,
  syntheticProteinMsa,
} from './svgTestUtil.ts'

beforeAll(() => {
  installSvgTestEnv()
})

function makeModel({ rows = 60, cols = 400 } = {}) {
  return createTestModel({ data: { msa: syntheticProteinMsa(rows, cols) } })
}

const rootRect = (svg: string) => /<rect[^>]*height="100%"[^>]*>/.exec(svg)?.[0]

test('the page takes the theme background, not a hardcoded white', async () => {
  const model = makeModel({ rows: 4, cols: 20 })
  const dark = createJBrowseTheme({ palette: { mode: 'dark' } })
  expect(dark.palette.background.default).not.toBe('white')

  const svg = await renderToSvg(model, { theme: dark, exportType: 'entire' })

  // the layers below draw in theme colors: text.primary is near-white in a dark
  // theme, so a white page would export white on white
  expect(rootRect(svg)).toContain(`fill="${dark.palette.background.default}"`)
})

test('a viewport export is the alignment canvas, not the whole widget', async () => {
  const model = makeModel()
  expect(model.showHorizontalScrollbar).toBe(true)
  expect(model.showVerticalScrollbar).toBe(true)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'viewport',
    includeMinimap: true,
  })

  // the widget box also covers the resize handle and the scrollbars; exporting
  // it drew the rows and columns those hide
  const {
    treeAreaWidth,
    msaCanvasWidth,
    msaAreaHeight,
    minimapHeight,
    totalTrackAreaHeight,
  } = model
  expect(svg).toContain(`width="${treeAreaWidth + msaCanvasWidth}"`)
  expect(svg).toContain(`height="${msaAreaHeight + minimapHeight}"`)
  // the tracks are left out of this export, and so is the band they occupy on
  // screen: the three together are the widget
  expect(msaAreaHeight + minimapHeight + totalTrackAreaHeight).toBe(
    model.height,
  )
})

test('no attribute is serialized as the string "undefined"', async () => {
  const model = makeModel({ rows: 4, cols: 20 })
  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
  })

  expect(svg).toContain('<text')
  expect(svg).not.toContain('="undefined"')
})

// The panel ids let a figure be taken apart in Illustrator or svgutils, so they
// read the same in every export. The clipPath ids carry the model id instead,
// which keeps two viewers on one page from clipping each other.
function idsOf(svg: string, attr: string) {
  return [...svg.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'))].map(m => m[1]!)
}

function panelIds(svg: string) {
  return idsOf(svg, 'id')
    .filter(id => id.endsWith('-panel'))
    .sort()
}

function exportWithPanels(id: string) {
  const model = createTestModel({
    id,
    data: { msa: syntheticProteinMsa(20, 400) },
  })
  model.setDomains({
    seq1: {
      xref: [{ id: 'seq1' }],
      matches: [
        {
          signature: {
            entry: {
              name: 'Kinase',
              accession: 'PF00069',
              description: 'Protein kinase domain',
            },
          },
          locations: [{ start: 1, end: 5 }],
        },
      ],
    },
  })
  return renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'viewport',
    includeMinimap: true,
    includeTracks: true,
  })
}

test('the panel ids do not vary with the model id', async () => {
  const a = await exportWithPanels('viewer-a')
  const b = await exportWithPanels('viewer-b')

  expect(panelIds(a)).toEqual([
    'legend-panel',
    'minimap-panel',
    'msa-panel',
    'tracks-panel',
    'tree-panel',
  ])
  expect(panelIds(b)).toEqual(panelIds(a))

  const clips = idsOf(a, 'clip-path')
  expect(clips).toContain('url(#tree-viewer-a)')
  expect(idsOf(b, 'clip-path')).not.toEqual(clips)
})
