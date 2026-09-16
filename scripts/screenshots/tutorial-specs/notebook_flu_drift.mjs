// Figures for docs/tutorials/notebook_flu_drift.md: 25 H3N2 hemagglutinins
// from 1968 to 2022, aligned and measured in a notebook.
//
// Every figure loads the hosted copies of the files
// docs/tutorials/scripts/build_flu_drift.py writes (data/h3n2/h3n2-ha.aln,
// .nh), and the drift track and the bands come out of the h3n2-layers.json the
// same run wrote. Callouts anchor on alignment columns and row labels, never
// pixels.

import fs from 'node:fs'
import path from 'node:path'

import { repoRoot } from '../lib.mjs'
import { fileSnap } from '../snap.mjs'

const dataDir = path.join(repoRoot, 'packages', 'app', 'public', 'data', 'h3n2')
const layers = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'h3n2-layers.json'), 'utf8'),
)
const alignment = fs.readFileSync(path.join(dataDir, 'h3n2-ha.aln'), 'utf8')

const REFERENCE = '1968_HongKong'
const LATEST = '2022_Massachusetts'

// residue of the 1968 row -> 0-based alignment column
const referenceColumn = (() => {
  const rows = {}
  let name = ''
  for (const line of alignment.split('\n')) {
    if (line.startsWith('>')) {
      name = line.slice(1).trim()
      rows[name] = ''
    } else if (line.trim()) {
      rows[name] += line.trim()
    }
  }
  const columns = []
  let residue = 0
  for (const [column, letter] of [...rows[REFERENCE]].entries()) {
    if (letter !== '-') {
      columns[++residue] = column
    }
  }
  return columns
})()

const band = label => layers.highlights.find(h => h.label === label)
const startColumn = label => referenceColumn[band(label).start]

const base = {
  height: 560,
  treeAreaWidth: 210,
  colWidth: 2.2,
  rowHeight: 16,
  colorSchemeName: 'clustalx_protein_dynamic',
  msaFilehandle: { uri: 'data/h3n2/h3n2-ha.aln' },
  treeFilehandle: { uri: 'data/h3n2/h3n2-ha.nh' },
}

// A close-up: one figure's worth of columns from `fromResidue` of the 1968 row,
// at a width that draws letters. The tree stays out of these, so the rows read
// down the years.
function closeup({ fromResidue, colWidth = 13, ...rest }) {
  return {
    ...base,
    colWidth,
    rowHeight: 20,
    treeFilehandle: undefined,
    treeAreaWidth: 210,
    scrollX: -referenceColumn[fromResidue] * colWidth,
    ...rest,
  }
}

export const specs = [
  {
    name: 'flu-drift-alignment',
    // No tree, so the rows keep the order the accession table lists them in,
    // which is 1968 at the top and 2022 at the bottom.
    url: fileSnap({
      ...base,
      height: 640,
      treeFilehandle: undefined,
      treeAreaWidth: 210,
    }),
    viewportWidth: 1400,
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: '25 hemagglutinins in year order, 567 columns',
        fontSize: 16,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 30 },
      },
    ],
  },
  {
    name: 'flu-drift-tree',
    // The neighbor-joining tree, rooted on the 1968 strain, beside the same
    // alignment. The rows come out close to the order they were sampled in,
    // and the tree was built without the years.
    url: fileSnap({ ...base, height: 640 }),
    viewportWidth: 1400,
    viewportHeight: 820,
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'root-to-tip distance against year: r = 0.985',
        fontSize: 16,
        maxWidth: 520,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 30 },
      },
    ],
  },
  {
    name: 'flu-drift-track',
    // The drift track over every column, with a band on each of the two site B
    // stretches and one on the fusion peptide. Each row draws as its
    // differences from 1968, so a column that never changed is a run of dots.
    url: fileSnap({
      ...base,
      height: 630,
      relativeTo: REFERENCE,
      columnTracks: layers.columnTracks,
      highlights: layers.highlights,
    }),
    viewportWidth: 1400,
    viewportHeight: 1000,
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'flu-drift-siteb',
    // Antigenic site B at letter resolution: 155 to 160 and 186 to 198 of HA1,
    // where a new vaccine strain reads something new nearly every time.
    url: fileSnap(
      closeup({
        fromResidue: band('site B 155-160').start - 6,
        height: 780,
        columnTracks: layers.columnTracks,
        highlights: layers.highlights,
      }),
    ),
    viewportWidth: 1400,
    viewportHeight: 1000,
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'flu-drift-fusion',
    // The HA2 fusion peptide at the same resolution: one substitution in the
    // whole series, between 1972 and 1975.
    url: fileSnap(
      closeup({
        fromResidue: band('fusion peptide').start - 4,
        height: 780,
        columnTracks: layers.columnTracks,
        highlights: layers.highlights,
      }),
    ),
    viewportWidth: 1400,
    viewportHeight: 1000,
    settle: 3000,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: {
          col: startColumn('fusion peptide') + 1,
          rowLabel: '1975_Victoria',
          rowLabelEnd: LATEST,
        },
        color: '#c0392b',
        pad: 2,
      },
    ],
  },
]
