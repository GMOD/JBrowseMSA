/**
 * Figures for docs/layers.md, one per layer the page documents.
 *
 * Each spec loads hosted files the tutorials already ship
 * (packages/app/public/data), and derives every column, tip name and tip count
 * from those files rather than hard-coding one: a re-run of a build script
 * moves a residue into a different column, and a `clades` record whose `tips`
 * no longer matches draws nothing at all.
 *
 * `residueMappings` has no figure here, because the layer draws nothing.
 */
import fs from 'node:fs'
import path from 'node:path'

import { repoRoot } from './lib.mjs'
import { fileSnap } from './snap.mjs'

const dataDir = path.join(repoRoot, 'packages', 'app', 'public', 'data')
const read = (...parts) => fs.readFileSync(path.join(dataDir, ...parts), 'utf8')

function readFasta(...parts) {
  const rows = {}
  let name
  for (const line of read(...parts).split('\n')) {
    if (line.startsWith('>')) {
      name = line.slice(1).trim()
      rows[name] = ''
    } else if (name) {
      rows[name] += line.trim()
    }
  }
  return rows
}

// ---------------------------------------------------------------- columnTracks

// Preproinsulin across nine vertebrates, with the three UniProt P01308 feature
// tables that the three track kinds each hold: a per-residue score, a
// per-residue category, and pairs of residues.
const insulin = readFasta('insulin.aln')
const insulinHuman = insulin.Human.replaceAll('-', '')

// Kyte-Doolittle hydropathy, shifted by 4.5 so the least hydrophobic residue is
// 0 and `max` is the full 9-unit range
const HYDROPATHY = {
  I: 4.5,
  V: 4.2,
  L: 3.8,
  F: 2.8,
  C: 2.5,
  M: 1.9,
  A: 1.8,
  G: -0.4,
  T: -0.7,
  S: -0.8,
  W: -0.9,
  Y: -1.3,
  P: -1.6,
  H: -3.2,
  E: -3.5,
  Q: -3.5,
  D: -3.5,
  N: -3.5,
  K: -3.9,
  R: -4.5,
}

// P01308: signal peptide 1-24, B chain 25-54, C peptide 57-87, A chain 90-110.
// The two pairs left over, 55-56 and 88-89, are the dibasic sites the
// convertases cut.
const CHAINS = [
  { from: 1, to: 24, char: 'S', color: '#bdbdbd' },
  { from: 25, to: 54, char: 'B', color: '#4e79a7' },
  { from: 57, to: 87, char: 'C', color: '#e8e8e8' },
  { from: 90, to: 110, char: 'A', color: '#e15759' },
]
const chainOf = residue =>
  CHAINS.find(c => residue >= c.from && residue <= c.to)?.char ?? '.'

const insulinTracks = [
  {
    id: 'hydropathy',
    name: 'Hydropathy',
    kind: 'bar',
    values: [...insulinHuman].map(aa => (HYDROPATHY[aa] ?? 0) + 4.5),
    max: 9,
    color: '#6a51a3',
    row: 'Human',
    height: 55,
  },
  {
    id: 'chain',
    name: 'Chain',
    kind: 'text',
    data: [...insulinHuman].map((_, i) => chainOf(i + 1)).join(''),
    colors: {
      ...Object.fromEntries(CHAINS.map(c => [c.char, c.color])),
      '.': '#fafafa',
    },
    row: 'Human',
  },
  {
    // The three disulfide bonds of P01308, on the human row's residues. B7-A7
    // and B19-A20 hold the mature hormone together across the C peptide that
    // processing cuts out; A6-A11 closes a loop inside the A chain.
    id: 'disulfides',
    name: 'Disulfide bonds',
    kind: 'arc',
    arcs: [
      { start: 31, end: 96 },
      { start: 43, end: 109 },
      { start: 95, end: 100 },
    ],
    color: '#b8860b',
    row: 'Human',
    height: 70,
  },
]

// ------------------------------------------------------------------ highlights

// p53 across fifteen vertebrates: the two UniProt domain bands the build script
// ships, the six IARC hotspot residues, and the rows outside Mammalia.
const p53Layers = JSON.parse(read('p53', 'p53-layers.json'))
const HOTSPOTS = [175, 245, 248, 249, 273, 282]
const NON_MAMMALS = ['Chicken', 'Turtle', 'Anole', 'Frog', 'Zebrafish']

// 248 and 249 are one column apart and a label draws to the right of its band,
// so only the right-hand one of the pair is labeled
const hotspotBands = HOTSPOTS.map(residue => ({
  row: 'Human',
  start: residue,
  end: residue,
  label:
    residue === 248 ? undefined : residue === 249 ? '248/249' : `${residue}`,
  color: 'rgba(192,57,43,0.45)',
}))

const p53Highlights = [
  ...p53Layers.highlights,
  ...hotspotBands,
  { rows: NON_MAMMALS, label: 'non-mammals', color: 'rgba(78,121,167,0.22)' },
]

// ------------------------------------------- clades, encodings and row panels

// Leaf names per subtree. The tem tree carries no quoted labels, no comments
// and no internal-node names, so a scanner over `(,);` reads it.
function parseNewick(text) {
  const s = text.trim()
  let at = 0
  const label = () => {
    const start = at
    while (at < s.length && !'(),;'.includes(s[at])) {
      at += 1
    }
    return s.slice(start, at).split(':')[0].trim()
  }
  const node = () => {
    if (s[at] !== '(') {
      return { children: [], leaves: [label()] }
    }
    at += 1
    const children = []
    for (;;) {
      children.push(node())
      if (s[at] === ',') {
        at += 1
      } else if (s[at] === ')') {
        at += 1
        break
      } else {
        throw new Error(`unparsed newick at ${at}`)
      }
    }
    label()
    return { children, leaves: children.flatMap(c => c.leaves) }
  }
  return node()
}

// 46 named TEM beta-lactamase alleles with NCBI's phenotype and subclass per
// allele and the residue each carries at eight Ambler positions.
const temRowData = JSON.parse(read('tem', 'tem-rowdata.json'))
const temTree = parseNewick(read('tem', 'tem.nwk'))

// The clades whose alleles all carry one subclass, largest first and each
// disjoint from the ones before it. The two largest are both CEPHALOSPORIN.
const pureSubclassClades = (() => {
  const nodes = []
  const walk = node => {
    if (node.children.length > 0) {
      nodes.push(node)
      node.children.forEach(walk)
    }
  }
  walk(temTree)
  const pure = nodes
    .filter(n => new Set(n.leaves.map(l => temRowData[l].subclass)).size === 1)
    .sort((a, b) => b.leaves.length - a.leaves.length)
  const taken = new Set()
  return pure.filter(n => {
    if (n.leaves.some(l => taken.has(l))) {
      return false
    }
    n.leaves.forEach(l => taken.add(l))
    return true
  })
})()

// `mrca` takes two tips whose most recent common ancestor is the clade. The
// first and the last leaf of a subtree sit in different children of its root,
// so the pair resolves to that root whatever the tree's shape.
const cladeMark = (clade, mark, extra) => ({
  mrca: [clade.leaves[0], clade.leaves.at(-1)],
  tips: clade.leaves.length,
  mark,
  ...extra,
})
const [markedClade, collapsedClade] = pureSubclassClades

const PHENOTYPE_COLORS = {
  map: {
    'broad-spectrum': '#4e79a7',
    'extended-spectrum': '#e15759',
    'inhibitor-resistant broad-spectrum': '#59a14f',
    'inhibitor-resistant extended-spectrum': '#b07aa1',
  },
}
const temAmblerPositions = Object.keys(temRowData['TEM-1'])
  .filter(field => field.startsWith('Ambler '))
  .map(field => field.slice(7))

// one color per residue letter, shared by the eight position strips, so the
// matrix carries one key
const LETTER_PALETTE = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
  '#86bcb6',
  '#d37295',
  '#a0cbe8',
  '#8cd17d',
]
const temLetters = [
  ...new Set(
    Object.values(temRowData).flatMap(record =>
      temAmblerPositions.map(p => record[`Ambler ${p}`]),
    ),
  ),
].sort((a, b) => a.localeCompare(b))
const RESIDUE_COLORS = {
  map: Object.fromEntries(
    temLetters.map((letter, i) => [
      letter,
      LETTER_PALETTE[i % LETTER_PALETTE.length],
    ]),
  ),
}

const temMatrix = [
  { kind: 'strip', field: 'phenotype', scale: PHENOTYPE_COLORS, width: 14 },
  ...temAmblerPositions.map(p => ({
    kind: 'strip',
    field: `Ambler ${p}`,
    scale: RESIDUE_COLORS,
    width: 12,
    header: p,
    legend: 'residue',
  })),
]

const TEM_FILES = {
  msaFilehandle: { uri: 'data/tem/tem.afa' },
  treeFilehandle: { uri: 'data/tem/tem.nwk' },
  treeMetadataFilehandle: { uri: 'data/tem/tem-rowdata.json' },
}
const temBase = {
  treeAreaWidth: 260,
  colWidth: 3,
  rowHeight: 14,
  colorSchemeName: 'clustalx_protein_dynamic',
  turnedOffTracks: { 'property-conservation': true },
  ...TEM_FILES,
}

// ------------------------------------------------------- the feature channels

const KINASE_FILES = {
  msaFilehandle: { uri: 'data/kinase.aln' },
  treeFilehandle: { uri: 'data/kinase.nh' },
  gffFilehandle: { uri: 'data/kinase-domains.gff' },
}

// ---------------------------------------------------------- the features panel

const TRP_FILES = {
  treeFilehandle: { uri: 'data/neighborhoods/trpB.nwk' },
  gffFilehandle: { uri: 'data/neighborhoods/trp-neighborhoods.gff' },
}
// the four values the role attribute takes across trp-neighborhoods.gff
const ROLE_COLORS = {
  map: {
    trp: '#4e79a7',
    regulator: '#e15759',
    pseudogene: '#f28e2b',
    other: '#d9d9d9',
  },
}
const trpPanel = extra => ({
  kind: 'features',
  x: 'position',
  width: 1080,
  header: 'trp neighborhood',
  encoding: { color: { field: 'role', scale: ROLE_COLORS }, label: 'Name' },
  transform: [{ type: 'align', on: 'trpB' }],
  ...extra,
})
const trpBase = { treeAreaWidth: 240, ...TRP_FILES }
// Both trp figures are almost entirely text: 176 gene labels plus the tip
// names, at deviceScaleFactor 2. Headless Chrome rasterizes a glyph one of two
// ways run to run, and across that many glyphs the two renders differ by up to
// 0.9% of pixels with nothing about the figure changed, which is past the 0.5%
// the diff gate allows. `--check` measured 0.861% here. Editing either spec
// therefore needs `--force` to commit the new capture.
const TEXT_JITTER = 0.02

export const specs = [
  {
    name: 'layers-columntracks',
    // the three track kinds over one small alignment: a bar per residue, a
    // character per residue, and three pairs of residues
    viewportWidth: 1600,
    viewportHeight: 490,
    url: fileSnap({
      height: 380,
      treeAreaWidth: 150,
      // colWidth has to clear rowHeight / 2 for the viewer to draw letters, so
      // the residues stay readable beside the per-residue tracks
      colWidth: 12,
      rowHeight: 18,
      colorSchemeName: 'clustalx_protein_dynamic',
      turnedOffTracks: { conservation: true, 'property-conservation': true },
      columnTracks: insulinTracks,
      msaFilehandle: { uri: 'data/insulin.aln' },
      treeFilehandle: { uri: 'data/insulin.nh' },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'layers-highlights',
    // the three shapes a highlight takes: a residue range with a label, a
    // single residue, and a set of whole rows
    viewportWidth: 1400,
    viewportHeight: 450,
    url: fileSnap({
      height: 340,
      treeAreaWidth: 140,
      colWidth: 2.4,
      rowHeight: 18,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      turnedOffTracks: { 'property-conservation': true },
      highlights: p53Highlights,
      msaFilehandle: { uri: 'data/p53/p53-vertebrates.afa' },
      treeFilehandle: { uri: 'data/p53/p53-vertebrates.nh' },
    }),
    // 478 columns against a reference row is the slowest capture here to reach
    // a painted tree and alignment; at 2500 both canvases came out blank with
    // the conservation track and the bands already drawn, which
    // assertViewerRendered passes
    settle: 6000,
    clip: 'viewer',
  },
  {
    name: 'layers-encodings',
    // tipLabel and branch over the phenotype field, rowTint over subclass with
    // a map naming one of its two values
    viewportWidth: 1400,
    viewportHeight: 850,
    url: fileSnap({
      ...temBase,
      height: 760,
      encodings: [
        { channel: 'tipLabel', field: 'phenotype', scale: PHENOTYPE_COLORS },
        { channel: 'branch', field: 'phenotype', scale: PHENOTYPE_COLORS },
        {
          channel: 'rowTint',
          field: 'subclass',
          scale: { map: { CEPHALOSPORIN: '#e15759' } },
        },
      ],
    }),
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'layers-clades',
    // three of the four marks at once: a rectangle and a labeled bracket over
    // the largest cephalosporin clade, and the next one folded to a triangle
    viewportWidth: 1400,
    viewportHeight: 790,
    url: fileSnap({
      ...temBase,
      // six rows fewer than the other tem figures, since one clade is folded
      height: 700,
      encodings: [
        { channel: 'tipLabel', field: 'phenotype', scale: PHENOTYPE_COLORS },
      ],
      clades: [
        cladeMark(markedClade, 'highlight', { color: '#fff3c4' }),
        cladeMark(markedClade, 'bracket', {
          color: '#b45309',
          label: `cephalosporin, ${markedClade.leaves.length}`,
        }),
        cladeMark(collapsedClade, 'collapse'),
      ],
    }),
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'layers-rowpanels',
    // nine strips between the tree and the alignment: the phenotype, then the
    // residue each allele carries at the eight Ambler positions
    viewportWidth: 1500,
    viewportHeight: 920,
    url: fileSnap({
      ...temBase,
      // the rotated strip headers take a band the other tem figures do not
      height: 830,
      encodings: [
        { channel: 'tipLabel', field: 'phenotype', scale: PHENOTYPE_COLORS },
      ],
      rowPanels: temMatrix,
    }),
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'layers-featurechannels',
    // featureFill and featureLabel over the description attribute of the
    // domain GFF, so each box takes its color and its text from the same field
    viewportWidth: 1400,
    viewportHeight: 440,
    url: fileSnap({
      height: 340,
      treeAreaWidth: 215,
      colWidth: 1.8,
      rowHeight: 24,
      colorSchemeName: 'clustalx_protein_dynamic',
      turnedOffTracks: { 'property-conservation': true },
      encodings: [
        {
          channel: 'featureFill',
          field: 'description',
          scale: { palette: 'set1' },
        },
        { channel: 'featureLabel', field: 'description' },
      ],
      ...KINASE_FILES,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'layers-featurespanel',
    // a tree, a GFF and one features panel, with no alignment at all: each
    // genome's genes in its own residue positions, aligned on trpB
    viewportWidth: 1500,
    viewportHeight: 520,
    url: fileSnap({
      ...trpBase,
      height: 430,
      rowHeight: 26,
      rowPanels: [trpPanel()],
    }),
    settle: 2500,
    diffThreshold: TEXT_JITTER,
    clip: 'viewer',
  },
  {
    name: 'layers-strandpile',
    // the same panel with the forward genes stacked above a line and the
    // reverse below it
    viewportWidth: 1500,
    viewportHeight: 620,
    url: fileSnap({
      ...trpBase,
      height: 530,
      rowHeight: 34,
      rowPanels: [trpPanel({ position: 'strandpile' })],
    }),
    settle: 2500,
    diffThreshold: TEXT_JITTER,
    clip: 'viewer',
  },
]

// The Shorthand, rowData, customColorScheme, selection and features sections
// of docs/layers.md link these states in the app and show no figure, so
// generate.mjs never captures them and only genGuideLinks reads the list.
export const linkSpecs = [
  {
    name: 'layers-shorthand',
    // the Shorthand section's example as written, with the p53 files the app
    // serves in place of their gmod.org URLs
    url: fileSnap({
      msa: 'data/p53/p53-vertebrates.afa',
      tree: 'data/p53/p53-vertebrates.nh',
      query: 'Human',
      highlights: ['102-292 DNA-binding', 175, 248, 273],
      region: '170-290',
      columnTracks: [
        {
          name: 'ClinVar',
          color: '#c0392b',
          max: 8,
          start: 104,
          values: [2, 1, 0, 0, 2, 4],
        },
      ],
    }),
  },
  {
    name: 'layers-rowdata',
    // the rowData section's inline snapshot: two rows and the JSON string
    // data.treeMetadata holds
    url: fileSnap({
      data: {
        msa: '>duck\nMKAANSE\n>chicken\nMKA-NSE',
        treeMetadata: JSON.stringify({
          duck: { clade: '2.3.4.4b' },
          chicken: { clade: '2.3.2.1c' },
        }),
      },
    }),
  },
  {
    name: 'layers-customcolorscheme',
    // the customColorScheme section's inline snapshot
    url: fileSnap({
      data: { msa: '>human\nMKAANSE\n>mouse\nMKA-NSE' },
      customColorScheme: {
        K: '#1f77b4',
        R: '#1f77b4',
        D: '#d62728',
        E: '#d62728',
      },
    }),
  },
  {
    name: 'layers-features',
    // the features section's inline snapshot
    url: fileSnap({
      data: { msa: '>human\nMKAANSEMKAANSE\n>mouse\nMKA-NSEMKA-NSE' },
      features: [
        { row: 'human', start: 2, end: 7, name: 'SH3', source: 'pfam' },
        { row: 'mouse', start: 3, end: 9, name: 'SH2', source: 'smart' },
      ],
      encodings: [{ channel: 'featureFill', field: 'source' }],
    }),
  },
  {
    name: 'layers-selection',
    // the selection section's inline snapshot
    url: fileSnap({
      data: { msa: '>human\nMKAANSE\n>mouse\nMKA-NSE\n>chicken\nMKSANSE' },
      selection: { start: 2, end: 5, rows: ['human', 'mouse'] },
    }),
  },
]
