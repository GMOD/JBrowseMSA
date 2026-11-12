// @vitest-environment jsdom
//
// End-to-end check of the impg (https://github.com/pangenome/impg) integration:
// impg's scripts/faln2html.py creates the model from a snapshot naming the
// percent-identity scheme and the fasta format, sets its width, then renders
// <MSAView model/>. This exercises that path headlessly via the
// public renderToSvg export. Polyfills mirror scripts/generateFigures.tsx.
import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { beforeAll, expect, test } from 'vitest'

import MSAModelF from './model.ts'
import { renderToSvg } from './renderToSvg.tsx'
import { installSvgTestEnv } from './svgTestUtil.ts'

beforeAll(() => {
  installSvgTestEnv()
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
  // the create() snapshot -- no setResidueColor/setMSAFormat action calls
  // needed. msaFormat:'fasta' forces the parser and skips the
  // heuristic fasta-vs-a3m sniffing. width is volatile (tracks container size)
  // so it remains an action.
  const model = MSAModelF().create({
    id: 'impg-test',
    type: 'MsaView',
    height: 400,
    residueColor: { scale: { scheme: 'percent_identity_dynamic' } },
    msaFormat: 'fasta',
    data: { msa: impgFastaAln },
  })
  model.setWidth(1300)

  // the declarative config took effect
  expect(model.dynamicColorSchemeName).toBe('percent_identity_dynamic')
  expect(model.cellFill).toBe('residue')
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
