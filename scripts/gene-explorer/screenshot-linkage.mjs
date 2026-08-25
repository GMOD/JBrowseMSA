/**
 * Reproducible gallery screenshot of the gene explorer's three-way linkage:
 * genome <-> alignment <-> AlphaFold structure, all connected, with a span of
 * protein residues selected so the SAME codons light in the LinearGenomeView,
 * the MSA columns, and the 3D structure at once.
 *
 * Drives the deployed gene-explorer page exactly like a user would (so the
 * session spec is the real one), opens it in headless swiftshader-WebGL Chrome,
 * selects the residue range on the structure model (what a click in molstar
 * does), waits for molstar + the highlights to paint, and writes the PNG.
 *
 *   node scripts/gene-explorer/screenshot-linkage.mjs [SYMBOL] [startRes] [endRes]
 * defaults: TP53, residues 197-202 (a 15 bp / 5-codon span; chr17 minus strand)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { delay } from '../screenshots/lib.mjs'
import {
  fetchJbrowseUrl,
  launchBrowser,
  openSession,
  waitForStructure,
} from './lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const OUT = path.join(
  repoRoot,
  'docs',
  'media',
  'gene-explorer-protein3d-linkage.png',
)

const SYMBOL = process.argv[2] ?? 'TP53'
const START = Number(process.argv[3] ?? 197)
const END = Number(process.argv[4] ?? 202)

const browser = await launchBrowser(
  { width: 1800, height: 980, deviceScaleFactor: 2 },
  ['--hide-scrollbars'],
)
try {
  const page = await browser.newPage()
  const url = await fetchJbrowseUrl(page, SYMBOL)
  if (!url) {
    throw new Error('gene-explorer page did not produce a JBrowse URL')
  }
  await openSession(page, url)
  await waitForStructure(page)

  // select the residue span on the structure: lights the codons in the LGV
  // (clickGenomeHighlights), the MSA columns, and the 3D structure together
  const region = await page.evaluate(
    (start, end) => {
      const s = window.JBrowseRootModel.session.views.find(
        v => v.type === 'ProteinView',
      ).structures[0]
      s.setClickedStructureRange({ start, end })
      const h = s.clickGenomeHighlights
      return h?.length ? { ...h[0] } : undefined
    },
    START,
    END,
  )
  console.log('selected genome region:', JSON.stringify(region))

  // let molstar paint the structure + the highlight overlays settle
  await delay(30000)
  await page.screenshot({ path: OUT })
  console.log(`wrote ${OUT}`)
} finally {
  await browser.close()
}
