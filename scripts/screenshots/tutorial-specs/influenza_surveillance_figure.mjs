// Figures for docs/tutorials/influenza_surveillance_figure.md: 204 tips of
// Nextstrain's H5N1 cattle-outbreak genome build, with the row table, the
// encodings, the strip matrix, the clade marks and the tree overview composed
// into one publication figure.
//
// The files are data/h5n1/*, written by
// docs/tutorials/scripts/build_influenza_surveillance_figure.py. Every row
// index, tip name and count below is one that script printed: it prunes the
// build's tree the same way the hosted Newick was pruned and then sorts each
// node's children by branch length, shortest first, which is the order the
// viewer lays the rows out in.

import { fileSnap } from '../snap.mjs'

const FILES = {
  msaFilehandle: { uri: 'data/h5n1/h5n1-ha.fa' },
  treeFilehandle: { uri: 'data/h5n1/h5n1.nwk' },
  treeMetadataFilehandle: { uri: 'data/h5n1/h5n1-rowdata.json' },
}

// All 204 rows at once: 8px rows, labels off, the tree area wide enough for
// the branch colors and the bracket gutter.
const WHOLE = {
  height: 1700,
  treeAreaWidth: 430,
  colWidth: 0.35,
  rowHeight: 8,
  drawLabels: false,
  colorSchemeName: 'nucleotide',
}

// The readable window: 38 rows at 18px starting on display row 41, the first
// row of the 138-tip clade, so the four human-case rows and the California
// clade are in the frame.
const ROW_H = 18
const WINDOW_TOP = 41
const READABLE = {
  height: 700,
  treeAreaWidth: 560,
  colWidth: 0.35,
  rowHeight: ROW_H,
  drawLabels: true,
  scrollY: -WINDOW_TOP * ROW_H,
  colorSchemeName: 'nucleotide',
}

// One color per amino acid, shared by the eight segment strips, so a state
// keeps its color across the matrix and the eight columns list one legend.
const RESIDUE_COLORS = {
  map: {
    G: '#4e79a7',
    I: '#f28e2b',
    K: '#e15759',
    M: '#76b7b2',
    N: '#59a14f',
    R: '#edc948',
    S: '#b07aa1',
    T: '#ff9da7',
    V: '#9c755f',
    X: '#bab0ac',
  },
}
const HOST_COLORS = {
  map: {
    Avian: '#4e79a7',
    Cattle: '#8c6d31',
    Human: '#e15759',
    'Nonhuman Mammal': '#b07aa1',
  },
}

// One site per segment, the site in each segment's protein whose minor state
// the most sampled tips carry.
const SEGMENT_FIELDS = [
  'PB2 670',
  'PB1 517',
  'PA 432',
  'HA 147',
  'NP 119',
  'NA 71',
  'M1 82',
  'NS1 67',
]
const hostStrip = {
  kind: 'strip',
  field: 'host',
  scale: HOST_COLORS,
  width: 12,
}
const segmentStrips = SEGMENT_FIELDS.map(field => ({
  kind: 'strip',
  field,
  scale: RESIDUE_COLORS,
  width: 11,
  legend: 'amino acid',
}))
const MATRIX = [hostStrip, ...segmentStrips]

// A second window, display rows 105-142, where the 17-row Idaho run sits
// between California rows, so the state colors change inside the frame.
const MIXED = { ...READABLE, scrollY: -105 * ROW_H }

const byState = channel => ({ channel, field: 'state' })

// The 138-tip clade carrying NP 119V, M1 82N and NS1 67G, display rows 41-178.
const SUBLINEAGE_MRCA = [
  'A/cattle/CA/24-027807-002-original/2024',
  'A/chicken/CA/24-031285-004-original/2024',
]
const SUBLINEAGE_HL = {
  mrca: SUBLINEAGE_MRCA,
  tips: 138,
  mark: 'highlight',
  color: '#ffd54f',
}
const SUBLINEAGE_BR = {
  mrca: SUBLINEAGE_MRCA,
  tips: 138,
  mark: 'bracket',
  color: '#a16207',
  label: 'NP 119V, 138',
}
// The largest clade whose tips all come from California, display rows 45-82.
const CALIFORNIA_MRCA = [
  'A/chicken/CA/24-031667-001-original/2024',
  'A/cattle/CA/24-037821-002-original/2024',
]
const CALIFORNIA_HL = {
  mrca: CALIFORNIA_MRCA,
  tips: 38,
  mark: 'highlight',
  color: '#ffd54f',
}
const CALIFORNIA_BR = {
  mrca: CALIFORNIA_MRCA,
  tips: 38,
  mark: 'bracket',
  color: '#c2410c',
  label: 'California, 38',
}
// The longest run of Idaho rows, 17 rows that are not a clade.
const IDAHO = {
  range: [
    'A/cattle/ID/25-012902-006-original/2025',
    'A/cattle/ID/26G09268-001-original/2026',
  ],
  tips: 17,
  mark: 'bracket',
  color: '#1d4ed8',
  label: 'Idaho, 17',
}
// 31 California dairy cattle and nothing else, display rows 147-177.
const COLLAPSE = {
  mrca: [
    'A/cattle/CA/24-034698-001-original/2024',
    'A/cattle/CA/24-037190-002-original/2024',
  ],
  tips: 31,
  mark: 'collapse',
}
const FOCUS = { mrca: SUBLINEAGE_MRCA, tips: 138, mark: 'focus' }

// The figure the page ends on: the view focused on the 138-tip clade, its
// labels and branches colored by state, the nine strips, the two brackets, the
// collapsed California cattle clade and the whole tree in the overview band.
const FINAL = {
  ...WHOLE,
  height: 1300,
  rowHeight: 12,
  treeAreaWidth: 620,
  drawLabels: true,
  showTreeOverview: true,
  encodings: [byState('tipLabel'), byState('branch')],
  rowPanels: MATRIX,
  clades: [CALIFORNIA_HL, CALIFORNIA_BR, IDAHO, COLLAPSE, FOCUS],
  ...FILES,
}

// The human case the page reads against the build, display row 49.
const CHECK_TIP = 'A/California/227/2024'

export const specs = [
  {
    name: 'influenza_surveillance_figure-rows',
    // the three files open with no channel reading the table: every tip label
    // draws in the theme's text color, and the callout names the fields the
    // table gives the row it points at
    viewportWidth: 1400,
    viewportHeight: 760,
    url: fileSnap({ ...READABLE, ...FILES }),
    settle: 3000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'host Human, state California, year 2024, PB2 670 R, NP 119 V',
        fontSize: 15,
        maxWidth: 340,
        anchor: { col: 8, rowLabel: CHECK_TIP, alignX: 'left' },
      },
    ],
  },
  {
    name: 'influenza_surveillance_figure-lineage',
    // tipLabel and branch over the state field, in the readable window
    viewportWidth: 1400,
    viewportHeight: 760,
    url: fileSnap({
      ...MIXED,
      encodings: [byState('tipLabel'), byState('branch')],
      ...FILES,
    }),
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'influenza_surveillance_figure-matrix',
    // the nine strips between the tree and the alignment, all 204 rows, the
    // eight segment columns listing one legend
    viewportWidth: 1500,
    viewportHeight: 1780,
    url: fileSnap({
      ...WHOLE,
      encodings: [byState('branch')],
      rowPanels: MATRIX,
      ...FILES,
    }),
    settle: 3500,
    clip: 'viewer',
  },
  {
    name: 'influenza_surveillance_figure-control',
    // one field per strip: NP 119, which the tree splits into 15 clades, and
    // host, which it splits into 112
    viewportWidth: 1500,
    viewportHeight: 1780,
    url: fileSnap({
      ...WHOLE,
      rowPanels: [
        { kind: 'strip', field: 'NP 119', scale: RESIDUE_COLORS, width: 16 },
        { ...hostStrip, width: 16 },
      ],
      ...FILES,
    }),
    settle: 3500,
    clip: 'viewer',
  },
  {
    name: 'influenza_surveillance_figure-clades',
    // the rectangle over the 138-tip clade and the two brackets in the gutter
    viewportWidth: 1500,
    viewportHeight: 1780,
    url: fileSnap({
      ...WHOLE,
      encodings: [byState('branch')],
      rowPanels: MATRIX,
      clades: [SUBLINEAGE_HL, SUBLINEAGE_BR, CALIFORNIA_BR, IDAHO],
      ...FILES,
    }),
    settle: 3500,
    clip: 'viewer',
  },
  {
    name: 'influenza_surveillance_figure-collapse',
    // the 31 California dairy cattle folded into one triangle
    viewportWidth: 1500,
    viewportHeight: 1780,
    url: fileSnap({
      ...WHOLE,
      encodings: [byState('branch')],
      rowPanels: MATRIX,
      clades: [SUBLINEAGE_HL, SUBLINEAGE_BR, CALIFORNIA_BR, IDAHO, COLLAPSE],
      ...FILES,
    }),
    settle: 3500,
    clip: 'viewer',
  },
  {
    name: 'influenza_surveillance_figure-overview',
    // the finished figure: the view focused on the 138-tip clade with the
    // whole tree in the overview band above it
    viewportWidth: 1500,
    viewportHeight: 1400,
    url: fileSnap(FINAL),
    settle: 3500,
    clip: 'viewer',
  },
  {
    name: 'influenza_surveillance_figure-export',
    // the export dialog over the finished figure
    viewportWidth: 1500,
    viewportHeight: 1400,
    url: fileSnap(FINAL),
    settle: 3500,
    actions: [
      { click: '[data-testid="file_menu"]' },
      { click: '::-p-text(Export SVG)' },
      { waitFor: '::-p-text(Export type)' },
    ],
    clip: 'full',
  },
]
