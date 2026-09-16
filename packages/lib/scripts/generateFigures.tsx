/**
 * Generates the example figures embedded in the READMEs by driving the
 * viewer's own SVG export (renderToSvg) headlessly under jsdom. No browser.
 *
 * Run with:  pnpm figures   (from the repo root)
 *
 * svgcanvas needs a few DOM bits jsdom omits — DOMMatrix/DOMPoint and a 2d
 * context for text metrics — so we polyfill the minimum it actually calls.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { enableStaticRendering } from 'mobx-react'
import { test } from 'vitest'

import { proteinMSA, proteinTree } from '../../examples/src/examples/data.ts'
import { installHeadlessRenderEnv } from '../src/headlessRenderEnv.ts'
import MSAModelF from '../src/model.ts'
import { renderToSvg } from '../src/renderToSvg.tsx'

function setup() {
  enableStaticRendering(true)
  installHeadlessRenderEnv()
}

// Inline data mirroring the R package README examples, so the R figures are
// authentic output of the same viewer the htmlwidget embeds.
const hemoglobinMSA = `>human
MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH
>mouse
MVLSGEDKSNIKAAWGKIGGHGAEYGAEALERMFASFPTTKTYFPHFDVSH
>goat
MSLTRTERTIILSLWSKISTQADVIGTETLERLFSCYPQAKTYFPHFDLHS
`
const hemoglobinTree = '((human:0.1,mouse:0.2):0.05,goat:0.3);'

const dnaMSA = `>seqA
ATGCGATCGATCGATCGATCGATCG
>seqB
ATGCGATCGATGCGATCGATCGATCG
>seqC
ATGCGTTCGATCGATCAATCGATCG
>seqD
ATGCGATCGATCGATCGATCTATCG
`
const dnaTree = '((seqA:0.1,seqB:0.15):0.1,(seqC:0.2,seqD:0.05):0.1);'

// Rhodopsin N-termini with an InterProScan-shaped GFF over them, ungapped so a
// domain's residue coordinates are its columns.

const domainsMSA = `>GPCR_human
MNGTEGPNFYVPFSNATGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIVLGFPINFLTLYVTVQHKKLR
>GPCR_mouse
MNGTEGPNFYVPFSNKTGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIMLGFPINFLTLYVTVQHKKLR
>GPCR_bovine
MNGTEGPNFYVPFSNATGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLIVLGFPINFLTLYVTVQHKKLR
>GPCR_chicken
MNGTEGPNFYVPFSNKSGVVRSPFEYPQYYLAEPWQFSMLAAYMFLLILLGFPINFLTLYVTIQHKKLR
`

const domainsGFF = `##gff-version 3
GPCR_human\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7 transmembrane receptor (rhodopsin family)
GPCR_mouse\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7 transmembrane receptor (rhodopsin family)
GPCR_bovine\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7 transmembrane receptor (rhodopsin family)
GPCR_chicken\tInterProScan\tprotein_match\t6\t62\t.\t.\t.\tName=PF00001;description=7 transmembrane receptor (rhodopsin family)
`

const figures = [
  {
    name: 'example-protein',
    colorScheme: 'maeditor',
    data: { msa: proteinMSA, tree: proteinTree },
  },
  {
    name: 'r-quickstart',
    colorScheme: 'clustal',
    treeAreaWidth: 160,
    data: { msa: hemoglobinMSA, tree: hemoglobinTree },
  },
  {
    name: 'r-nucleotide',
    colorScheme: 'nucleotide',
    treeAreaWidth: 160,
    data: { msa: dnaMSA, tree: dnaTree },
  },
  {
    name: 'example-domains',
    colorScheme: 'clustalx_protein_dynamic',
    treeAreaWidth: 220,
    data: { msa: domainsMSA, tree: '', gff: domainsGFF },
  },
]

test('generate README figures', async () => {
  setup()
  const theme = createJBrowseTheme()
  const outDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../docs/media',
  )

  for (const fig of figures) {
    const model = MSAModelF().create({
      // fixed id keeps the generated clipPath ids (and thus the SVG output)
      // stable across runs, so regenerating doesn't churn the committed files
      id: fig.name,
      type: 'MsaView',
      height: 400,
      colorSchemeName: fig.colorScheme,
      data: fig.data,
    })
    if (fig.treeAreaWidth !== undefined) {
      model.setTreeAreaWidth(fig.treeAreaWidth)
    }
    model.setWidth(900)
    const svg = await renderToSvg(model, {
      theme,
      exportType: 'entire',
      includeMinimap: false,
      includeTracks: false,
    })
    fs.writeFileSync(path.join(outDir, `${fig.name}.svg`), svg)
    console.log(`wrote ${fig.name}.svg`)
  }
}, 60000)
