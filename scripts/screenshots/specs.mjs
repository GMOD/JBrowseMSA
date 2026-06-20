// Screenshot specs for the demo app (packages/app). Each spec loads the app at a
// URL, optionally runs a few actions (clicking the icon menus), then captures
// either the viewer container (clip: 'viewer') or the whole viewport (for menus
// and dialogs that render in portals outside the viewer).
//
// The app reads a `?data=` URL param as a JSON model snapshot, so we can
// deep-link a fully loaded alignment instead of driving the import form.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Single source of truth: the real example datasets live in the examples
// package as TS string constants. This script runs under plain node (no TS
// loader), so read the file and pull the constants out by name rather than
// importing or duplicating the (multi-KB) data here.
const exampleData = fs.readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../packages/examples/src/examples/exampleData.ts',
  ),
  'utf8',
)
function backtickConst(name) {
  const m = exampleData.match(new RegExp(`export const ${name} = \`([\\s\\S]*?)\``))
  if (!m) {
    throw new Error(`could not find ${name} in exampleData.ts`)
  }
  return m[1]
}
const kinaseMSA = backtickConst('kinaseMSA')
const kinaseDomainsGFF = backtickConst('kinaseDomainsGFF')
const lysineMSA = backtickConst('lysineMSA')
const kinaseTree = exampleData.match(
  /export const kinaseTree =\s*'([^']*)'/,
)[1]

// Small IL2RA protein alignment + matching tree (same data as the examples).
const proteinMSA = `CLUSTAL O(1.2.3) multiple sequence alignment
UniProt|P26898|IL2RA_SHEEP      MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM
UniProt|P01590|IL2RA_MOUSE      MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI
UniProt|P41690|IL2RA_FELCA      MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM
UniProt|P01589|IL2RA_HUMAN      MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM
UniProt|Q5MNY4|IL2RA_MACMU      MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM
UniProt|P26896|IL2RB_RAT        MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV
`

const proteinTree =
  '(((UniProt|P26898|IL2RA_SHEEP:0.24,(UniProt|P41690|IL2RA_FELCA:0.18,(UniProt|P01589|IL2RA_HUMAN:0.04,UniProt|Q5MNY4|IL2RA_MACMU:0.04):0.13):0.05):0.02,UniProt|P01590|IL2RA_MOUSE:0.23):0.07,UniProt|P26896|IL2RB_RAT:0.34);'

function data(extra) {
  const snap = {
    msaview: {
      type: 'MsaView',
      height: 185,
      treeAreaWidth: 250,
      data: { msa: proteinMSA, tree: proteinTree },
      ...extra,
    },
  }
  return `?data=${encodeURIComponent(JSON.stringify(snap))}`
}

export const specs = [
  {
    name: 'import-form',
    url: '',
    waitFor: '::-p-text(Examples)',
    clip: 'viewer',
  },
  {
    name: 'colorscheme-clustalx',
    url: data({ colorSchemeName: 'clustalx_protein_dynamic' }),
    clip: 'viewer',
  },
  {
    name: 'colorscheme-pid',
    url: data({ colorSchemeName: 'percent_identity_dynamic' }),
    clip: 'viewer',
  },
  {
    name: 'settings-dialog',
    url: data({ colorSchemeName: 'maeditor' }),
    actions: [
      { click: '[data-testid="file_menu"]' },
      { click: '::-p-text(More settings)' },
      { waitFor: '::-p-text(Tree options)' },
    ],
    clip: 'full',
  },
  {
    name: 'real-domains',
    // zoomed out (small colWidth) so the full ~526-column alignment fits and
    // the shared SH3 + SH2 + kinase domain architecture shows as colored
    // blocks aligned down every member of the family
    url: data({
      height: 360,
      treeAreaWidth: 175,
      colWidth: 2,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: { msa: kinaseMSA, tree: kinaseTree, gff: kinaseDomainsGFF },
    }),
    clip: 'viewer',
  },
  {
    name: 'large-tree',
    url: data({
      height: 480,
      treeAreaWidth: 300,
      colorSchemeName: 'nucleotide',
      data: { msa: lysineMSA },
    }),
    settle: 3500,
    clip: 'viewer',
  },
]
