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
  const m = exampleData.match(
    new RegExp(`export const ${name} = \`([\\s\\S]*?)\``),
  )
  if (!m) {
    throw new Error(`could not find ${name} in exampleData.ts`)
  }
  return m[1]
}
const kinaseMSA = backtickConst('kinaseMSA')
const kinaseDomainsGFF = backtickConst('kinaseDomainsGFF')
const lysineMSA = backtickConst('lysineMSA')
const kinaseTree = exampleData.match(/export const kinaseTree =\s*'([^']*)'/)[1]

// The phylogeny examples (MyD88/globin/ACE2/opsins) are built reproducibly into
// generatedData.ts by scripts/examples-gen; read those constants the same way.
const generatedData = fs.readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../packages/examples/src/examples/generatedData.ts',
  ),
  'utf8',
)
function genConst(name) {
  const m = generatedData.match(
    new RegExp(`export const ${name} = \`([\\s\\S]*?)\``),
  )
  if (!m) {
    throw new Error(`could not find ${name} in generatedData.ts`)
  }
  return m[1]
}
// The opsin domain GFF is an out-of-band InterProScan product (see
// scripts/examples-gen/README.md); keep the opsin spec out until it's present.
const hasOpsinDomains = /export const opsinDomainsGFF = /.test(generatedData)

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

// Like data(), but with no inline-alignment default: for specs that load their
// (large) alignment from a hosted file via *Filehandle props pointing at
// data/<file> (written by scripts/screenshots/writeExampleData.mjs, served at
// the app root). Keeps the deep-link a few hundred bytes instead of tens of KB.
// The uri is relative, so it resolves against the page — localhost during
// capture, gmod.org/JBrowseMSA/demo/ once deployed.
function fileSnap(msaview) {
  const snap = { msaview: { type: 'MsaView', ...msaview } }
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
    url: fileSnap({
      height: 360,
      treeAreaWidth: 175,
      colWidth: 2,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/kinase.aln' },
      treeFilehandle: { uri: 'data/kinase.nh' },
      gffFilehandle: { uri: 'data/kinase-domains.gff' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'large-tree',
    url: fileSnap({
      height: 480,
      treeAreaWidth: 300,
      colorSchemeName: 'nucleotide',
      msaFilehandle: { uri: 'data/lysine.stock' },
    }),
    settle: 3500,
    clip: 'viewer',
  },
  {
    name: 'color-scheme-menu',
    url: data({ colorSchemeName: 'clustal' }),
    actions: [
      { click: '[data-testid="color_scheme_menu"]' },
      { waitFor: '::-p-text(percent_identity_dynamic)' },
    ],
    clip: 'full',
  },
  {
    name: 'tree-collapse',
    // collapse the (FELCA,(HUMAN,MACMU)) subclade; node ids are deterministic
    // from generateNodeIds (msa-parsers/src/util.ts): root 'node-0', each child
    // appends '-<index>-<depth>'. Collapsing it draws the clade as a triangle
    // labelled with its tip count and drops those rows (and the gaps they
    // introduced) from the MSA.
    url: data({ collapsed: ['node-0-0-1-0-2-1-3'] }),
    clip: 'viewer',
  },
  {
    name: 'export-svg-dialog',
    url: data({}),
    actions: [
      { click: '[data-testid="file_menu"]' },
      { click: '::-p-text(Export SVG)' },
      { waitFor: '::-p-text(Export type)' },
    ],
    clip: 'full',
  },
  {
    name: 'metadata-dialog',
    url: data({ data: { msa: proteinMSA, tree: proteinTree } }),
    actions: [
      { click: '[data-testid="file_menu"]' },
      { click: '::-p-text(Metadata)' },
      { waitFor: '::-p-text(sequence)' },
    ],
    clip: 'full',
  },
  {
    name: 'reference-dots',
    // relativeTo=Human: identical residues render as ".", so the lineage-
    // specific MyD88 substitutions (and the bat clade) stand out next to the
    // inferred tree. Readable column width so the dots/letters are legible.
    url: data({
      height: 460,
      treeAreaWidth: 150,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: genConst('myd88MSA'),
        tree: genConst('myd88Tree'),
      },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'gene-duplication',
    // globin family: the tree groups by globin TYPE across species, the
    // signature of gene duplication
    url: data({
      height: 420,
      treeAreaWidth: 215,
      colWidth: 7,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: genConst('globinMSA'),
        tree: genConst('globinTree'),
      },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'host-range',
    // ACE2 diffed against human; the few divergent spike-contact residues in
    // the N-terminal peptidase domain pop out of the otherwise-conserved protein
    url: data({
      height: 460,
      treeAreaWidth: 250,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: genConst('ace2MSA'),
        tree: genConst('ace2Tree'),
      },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  ...(hasOpsinDomains
    ? [
        {
          name: 'opsin-classes',
          // vertebrate opsins: tree sorts by opsin class, with the real
          // InterProScan 7TM-GPCR domain overlay across each sequence
          url: data({
            height: 420,
            treeAreaWidth: 200,
            colWidth: 4,
            colorSchemeName: 'clustalx_protein_dynamic',
            data: {
              msa: genConst('opsinMSA'),
              tree: genConst('opsinTree'),
              gff: genConst('opsinDomainsGFF'),
            },
          }),
          settle: 2500,
          clip: 'viewer',
        },
      ]
    : []),
  {
    name: 'extreme-conservation',
    // histone H4 vs human: one of the most conserved proteins known renders
    // almost entirely as dots, with only the distant lineages showing letters
    url: data({
      height: 300,
      treeAreaWidth: 150,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: genConst('histoneH4MSA'),
        tree: genConst('histoneH4Tree'),
      },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'deep-phylogeny',
    // cytochrome c from mammals to plants/fungi: the tree spans >1 billion years
    url: data({
      height: 320,
      treeAreaWidth: 160,
      colWidth: 9,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: genConst('cytochromeCMSA'),
        tree: genConst('cytochromeCTree'),
      },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'convergent-evolution',
    // prestin: the echolocating bat + toothed whales ("_echo") group together,
    // pulled off the species tree by convergent selection
    url: data({
      height: 440,
      treeAreaWidth: 230,
      colWidth: 2,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: genConst('prestinMSA'),
        tree: genConst('prestinTree'),
      },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'within-protein-conservation',
    // p53 vs human: the central DNA-binding domain collapses to dots while the
    // variable N/C-termini stay full of letters
    url: data({
      height: 480,
      treeAreaWidth: 175,
      colWidth: 3,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: genConst('p53MSA'),
        tree: genConst('p53Tree'),
      },
    }),
    settle: 2500,
    clip: 'viewer',
  },
]
