/**
 * Figures for docs/tutorials/tem_alleles.md: 46 named TEM beta-lactamase
 * alleles from NCBI's Reference Gene Catalog, with the phenotype the catalog
 * records and the residue each allele carries at the Ambler positions behind
 * extended-spectrum and inhibitor-resistant resistance.
 *
 * The spec reads the alignment and the row table the build script wrote
 * (packages/app/public/data/tem), so the columns the callouts and the
 * highlights land on come from the files rather than from this file.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileSnap } from '../snap.mjs'

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/app/public/data/tem',
)
const read = name => fs.readFileSync(path.join(dataDir, name), 'utf8')

const REFERENCE = 'TEM-1'

const aligned = {}
let name
for (const line of read('tem.afa').split('\n')) {
  if (line.startsWith('>')) {
    name = line.slice(1).trim()
    aligned[name] = ''
  } else if (name) {
    aligned[name] += line.trim()
  }
}

const rowData = JSON.parse(read('tem-rowdata.json'))
const positions = Object.keys(rowData[REFERENCE])
  .filter(field => field.startsWith('Ambler '))
  .map(field => Number(field.slice(7)))

// Ambler numbering over the 286-residue TEM-1 sequence: it starts at 3 and
// skips 239 and 253, the same arithmetic the build script prints
const ambler = index => {
  let position = index + 2
  if (position >= 239) {
    position += 1
  }
  if (position >= 253) {
    position += 1
  }
  return position
}

// Ambler position -> 0-based alignment column, through the reference row
const amblerColumn = {}
let residue = 0
for (const [index, char] of [...aligned[REFERENCE]].entries()) {
  if (char !== '-') {
    residue += 1
    amblerColumn[ambler(residue)] = index
  }
}

const ESBL = [104, 164, 238, 240]
const INHIBITOR = [69, 244, 276]
const CONTROL = positions.find(p => !ESBL.includes(p) && !INHIBITOR.includes(p))

const FILES = {
  msaFilehandle: { uri: 'data/tem/tem.afa' },
  treeFilehandle: { uri: 'data/tem/tem.nwk' },
}
const TABLE = { treeMetadataFilehandle: { uri: 'data/tem/tem-rowdata.json' } }

const PHENOTYPE_COLORS = {
  map: {
    'broad-spectrum': '#4e79a7',
    'extended-spectrum': '#e15759',
    'inhibitor-resistant broad-spectrum': '#59a14f',
    'inhibitor-resistant extended-spectrum': '#b07aa1',
  },
}

// one color per residue letter, shared by the eight position strips, so a
// letter keeps its color across the matrix and the strips list one legend
const PALETTE = [
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
const letters = [
  ...new Set(
    Object.values(rowData).flatMap(record =>
      positions.map(p => record[`Ambler ${p}`]),
    ),
  ),
].sort((a, b) => a.localeCompare(b))
const RESIDUE_COLORS = {
  map: Object.fromEntries(
    letters.map((l, i) => [l, PALETTE[i % PALETTE.length]]),
  ),
}

const phenotypeStrip = {
  kind: 'strip',
  field: 'phenotype',
  scale: PHENOTYPE_COLORS,
  width: 14,
  header: 'phenotype',
}
const positionStrips = positions.map(p => ({
  kind: 'strip',
  field: `Ambler ${p}`,
  scale: RESIDUE_COLORS,
  width: 12,
  // the header band is as tall as the minimap, so a header longer than the
  // Ambler number is cut off in it
  header: String(p),
  legend: 'residue',
}))
const MATRIX = [phenotypeStrip, ...positionStrips]

const HIGHLIGHTS = [...ESBL, ...INHIBITOR, CONTROL].map(p => ({
  start: amblerColumn[p] + 1,
  end: amblerColumn[p] + 1,
  label: `Ambler ${p}`,
  color: p === CONTROL ? 'rgba(120,120,120,0.35)' : 'rgba(225,87,89,0.35)',
}))

// 46 rows at 16px beside a tree wide enough for the allele names, and tall
// enough that the rows end above the frame's bottom edge, where the callouts go
const WIDE = {
  height: 920,
  turnedOffTracks: { 'property-conservation': true },
  treeAreaWidth: 200,
  colWidth: 4.2,
  rowHeight: 16,
  drawLabels: true,
  colorSchemeName: 'clustalx_protein_dynamic',
  ...FILES,
}
// A close-up starts a few columns to the left of its position, so the frame
// carries some context, and stops short of the right edge of the alignment,
// where the columns run out and the frame fills with white.
const VISIBLE_COLUMNS = 58
const closeUp = (position, colWidth = 22) => ({
  ...WIDE,
  colWidth,
  scrollX:
    -Math.min(
      amblerColumn[position] - 6,
      aligned[REFERENCE].length - VISIBLE_COLUMNS,
    ) * colWidth,
  relativeTo: REFERENCE,
})

export const specs = [
  {
    name: 'tem_alleles-alignment',
    // the alignment and the tree on their own: 46 alleles of one protein
    viewportWidth: 1600,
    viewportHeight: 1060,
    url: fileSnap(WIDE),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `${Object.keys(aligned).length} alleles, ${aligned[REFERENCE].length} columns`,
        fontSize: 16,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 40 },
      },
    ],
  },
  {
    name: 'tem_alleles-tip-labels',
    // the row table loaded and the tipLabel channel reading its phenotype
    // field, which colors each allele name by what the catalog records
    viewportWidth: 1600,
    viewportHeight: 1060,
    url: fileSnap({
      ...WIDE,
      ...TABLE,
      encodings: [{ channel: 'tipLabel', field: 'phenotype' }],
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'tem_alleles-strips',
    // the phenotype strip and one strip per Ambler position, between the tree
    // and the alignment
    viewportWidth: 1600,
    viewportHeight: 1060,
    url: fileSnap({
      ...WIDE,
      ...TABLE,
      encodings: [{ channel: 'tipLabel', field: 'phenotype' }],
      rowPanels: MATRIX,
    }),
    settle: 3000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `Ambler ${ESBL.join(', ')} then ${INHIBITOR.join(', ')} then ${CONTROL}`,
        fontSize: 15,
        maxWidth: 420,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 40 },
      },
    ],
  },
  {
    name: 'tem_alleles-highlights',
    // the same eight positions as bands over the alignment columns
    viewportWidth: 1600,
    viewportHeight: 1060,
    url: fileSnap({
      ...WIDE,
      ...TABLE,
      encodings: [{ channel: 'tipLabel', field: 'phenotype' }],
      highlights: HIGHLIGHTS,
      // the collapsed key leaves the rightmost highlight labels readable
      showDomainLegend: false,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'tem_alleles-esbl',
    // Ambler 238 and 240 at residue resolution, every row read against TEM-1
    viewportWidth: 1600,
    viewportHeight: 1060,
    url: fileSnap({
      ...closeUp(238),
      ...TABLE,
      encodings: [{ channel: 'tipLabel', field: 'phenotype' }],
      highlights: HIGHLIGHTS,
      // the collapsed key leaves the rightmost highlight labels readable
      showDomainLegend: false,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: amblerColumn[238], colEnd: amblerColumn[240] },
        pad: 3,
      },
      {
        type: 'text',
        text: 'Ambler 238 and 240: G238S and E240K in the cephalosporin rows',
        fontSize: 16,
        maxWidth: 520,
        anchor: {
          col: amblerColumn[238],
          colEnd: amblerColumn[240],
          alignY: 'bottom',
          dy: 44,
        },
      },
    ],
  },
  {
    name: 'tem_alleles-control',
    // the control position at the same resolution: four alleles carry M, and
    // they come from three different phenotypes
    viewportWidth: 1600,
    viewportHeight: 1060,
    url: fileSnap({
      ...closeUp(CONTROL),
      ...TABLE,
      encodings: [{ channel: 'tipLabel', field: 'phenotype' }],
      highlights: HIGHLIGHTS,
      // the collapsed key leaves the rightmost highlight labels readable
      showDomainLegend: false,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: amblerColumn[CONTROL] },
        pad: 3,
      },
      {
        type: 'text',
        text: `Ambler ${CONTROL}: M in four alleles of three phenotypes`,
        fontSize: 16,
        maxWidth: 460,
        anchor: {
          col: amblerColumn[CONTROL],
          alignX: 'left',
          alignY: 'bottom',
          dy: 44,
        },
      },
    ],
  },
  {
    name: 'tem_alleles-final',
    // the whole figure: the tip labels and the strips from the table, the
    // bands over the eight columns, the alignment behind them
    viewportWidth: 1600,
    viewportHeight: 1060,
    url: fileSnap({
      ...WIDE,
      ...TABLE,
      encodings: [{ channel: 'tipLabel', field: 'phenotype' }],
      rowPanels: MATRIX,
      highlights: HIGHLIGHTS,
    }),
    settle: 3000,
    clip: 'viewer',
  },
]
