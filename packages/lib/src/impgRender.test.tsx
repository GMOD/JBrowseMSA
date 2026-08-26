// @vitest-environment jsdom
//
// End-to-end check of the impg (https://github.com/pangenome/impg) integration:
// impg's scripts/faln2html.py drives the viewer exactly as below --
//   MSAModelF().create({ type:'MsaView', data:{ msa } })
//   model.setColorSchemeName('percent_identity_dynamic')
//   model.setBgColor(true); model.setWidth(1300)
// then renders <MSAView model/>. This exercises that path headlessly via the
// public renderToSvg export. Polyfills mirror scripts/generateFigures.tsx.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { beforeAll, expect, test } from 'vitest'

import { installHeadlessRenderEnv } from './headlessRenderEnv.ts'
import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'

beforeAll(() => {
  enableStaticRendering(true)
  installHeadlessRenderEnv()
})

// representative `impg query -o fasta-aln` block: PanSN names with region
// colons, dash gaps, mixed-case (soft-masked) bases
const impgFastaAln = `>HG002#1#chr1:1000-1040
ACGTACGT--ACGTNNNNacgtACGTACGTACGTACGT
>HG003#1#chr1:1000-1040
ACGTAC-TGGACGTNNNNACGTAC--ACGTacgtACGT
>CHM13#0#chr1:1000-1040
ACGTACGTGGACGTNNNNACGT----ACGTACGTACGT`

test('renders an impg fasta-aln block with declarative impg config', async () => {
  // everything except width is a declarative MST property, so it can be set in
  // the create() snapshot -- no setColorSchemeName/setBgColor/setMSAFormat
  // action calls needed. msaFormat:'fasta' forces the parser and skips the
  // heuristic fasta-vs-a3m sniffing. width is volatile (tracks container size)
  // so it remains an action.
  const model = MSAModelF().create({
    id: 'impg-test',
    type: 'MsaView',
    height: 400,
    colorSchemeName: 'percent_identity_dynamic',
    bgColor: true,
    msaFormat: 'fasta',
    data: { msa: impgFastaAln },
  })
  model.setWidth(1300)

  // the declarative config took effect
  expect(model.colorSchemeName).toBe('percent_identity_dynamic')
  expect(model.bgColor).toBe(true)
  expect(model.msaFormat).toBe('fasta')

  // the alignment parsed and all 3 rows are present at equal width
  expect(model.rowNames).toEqual([
    'HG002#1#chr1:1000-1040',
    'HG003#1#chr1:1000-1040',
    'CHM13#0#chr1:1000-1040',
  ])
  expect(model.numColumns).toBe(38)

  const svg = await renderToSvg(model, {
    theme: createJBrowseTheme(),
    exportType: 'entire',
    includeMinimap: false,
    includeTracks: false,
  })
  expect(svg).toContain('<svg')
  expect(svg).toContain('HG002#1#chr1:1000-1040')
})
