/**
 * Figures for docs/tutorials/recombination_breakpoint.md: five SARS-CoV-2
 * genomes as one alignment, with the XBB.1 row scanned against each of the two
 * BA.2 descendants it recombines, and the column where the two counts change
 * places.
 *
 * The spec reads every column, track and highlight from the files the build
 * script wrote (packages/app/public/data/recombinant), so a re-run that moves
 * the breakpoint moves the figures with it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileSnap } from '../snap.mjs'

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/app/public/data/recombinant',
)
const read = name => fs.readFileSync(path.join(dataDir, name), 'utf8')

const layers = JSON.parse(read('recombinant-layers.json'))
const { breakpoint, spike } = layers
const CHILD = 'XBB.1'

// ClustalW wraps its FASTA at 60 characters and the window file writes one line
// per row, so the first record's columns are every line up to the next defline
const columnCount = name => {
  const lines = read(name).split('\n')
  const first = lines.findIndex(l => l.startsWith('>'))
  let columns = 0
  for (const line of lines.slice(first + 1)) {
    if (line.startsWith('>')) {
      break
    }
    columns += line.trim().length
  }
  return columns
}
const genomeColumns = columnCount('recombinant.afa')
const windowColumns = columnCount('recombinant-rbd.afa')

const rows = {}
let row
for (const line of read('recombinant-rbd.afa').split('\n')) {
  if (line.startsWith('>')) {
    row = line.slice(1).trim()
    rows[row] = ''
  } else if (row) {
    rows[row] += line.trim()
  }
}

// columns of the window where a row carries another base than the recombinant,
// counting from 1 as the layers file does
const differsAt = (name, from, to) => {
  const out = []
  for (let c = from; c <= to; c++) {
    const a = rows[name][c - 1]
    const b = rows[CHILD][c - 1]
    if ('ACGT'.includes(a) && 'ACGT'.includes(b) && a !== b) {
      out.push(c)
    }
  }
  return out
}

const genome = {
  msaFilehandle: { uri: 'data/recombinant/recombinant.afa' },
  treeFilehandle: { uri: 'data/recombinant/recombinant.nwk' },
}
const rbd = {
  msaFilehandle: { uri: 'data/recombinant/recombinant-rbd.afa' },
  treeFilehandle: { uri: 'data/recombinant/recombinant.nwk' },
}
const genes = {
  gffFilehandle: { uri: 'data/recombinant/recombinant-genes.gff' },
  encodings: [{ channel: 'featureLabel', field: 'Name' }],
  showDomainLegend: false,
}

// A 1600px viewport clips to a 1560px viewer, and what is left of that after
// the tree area is what an alignment that fits the frame has to divide between
// its columns. The tree area is also the gutter the row labels and the track
// names draw in, and "XBB.1 vs BM.1.1.1" is the widest of them.
const TREE = 230
const PANEL = 1560 - TREE - 30

// the breakpoint interval as a band over the columns of the window file
const breakBand = {
  start: breakpoint.firstWindowColumn,
  end: breakpoint.lastWindowColumn,
  label: `breakpoint ${breakpoint.referenceStart}-${breakpoint.referenceEnd}`,
  color: 'rgba(0,0,0,0.18)',
}

const scanView = tracks => ({
  height: 500,
  treeAreaWidth: TREE,
  colWidth: PANEL / windowColumns,
  rowHeight: 26,
  colorSchemeName: 'nucleotide',
  ...rbd,
  columnTracks: tracks,
  highlights: [breakBand],
})

// 0-based, the arithmetic the callout anchors use; the layers file counts
// columns from 1, as the viewer's header does
const anchorCol = column => column - 1

// base resolution for the close-up, starting a dozen columns left of the break
const BASE_WIDTH = 21

// the two halves the breakpoint divides the window into, each counted on the
// parent that gave the recombinant the other half
const bjLeft = differsAt('BJ.1', 1, breakpoint.firstWindowColumn)
const bmRight = differsAt(
  'BM.1.1.1',
  breakpoint.lastWindowColumn,
  windowColumns,
)

export const specs = [
  {
    name: 'recombination_breakpoint-1',
    // the five genomes, the tree from them, and the reference annotation
    // projected onto every row
    viewportWidth: 1600,
    url: fileSnap({
      height: 340,
      treeAreaWidth: TREE,
      colWidth: PANEL / genomeColumns,
      rowHeight: 34,
      colorSchemeName: 'nucleotide',
      ...genome,
      ...genes,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: {
          col: anchorCol(spike.firstColumn),
          colEnd: anchorCol(spike.lastColumn),
        },
        pad: 3,
      },
      {
        type: 'text',
        text: `S, ${spike.referenceStart}-${spike.referenceEnd}`,
        fontSize: 16,
        anchor: {
          col: anchorCol(spike.firstColumn),
          colEnd: anchorCol(spike.lastColumn),
          alignY: 'bottom',
          dy: 34,
        },
      },
    ],
  },
  {
    name: 'recombination_breakpoint-2',
    // the scan: one count per parent over the receptor-binding domain, and the
    // column where the lower of the two changes hands
    viewportWidth: 1600,
    url: fileSnap(scanView(layers.recombinantTracks)),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: anchorCol(breakpoint.crossingWindowColumn) },
        pad: 2,
      },
      {
        type: 'text',
        text: `the two counts change places at ${breakpoint.crossingReference}`,
        fontSize: 16,
        maxWidth: 420,
        anchor: {
          col: anchorCol(breakpoint.crossingWindowColumn),
          alignY: 'bottom',
          dy: 44,
        },
      },
    ],
  },
  {
    name: 'recombination_breakpoint-3',
    // the control: the same scan for a genome that descends from neither
    // parent, over the same window
    viewportWidth: 1600,
    url: fileSnap(scanView(layers.controlTracks)),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'recombination_breakpoint-4',
    // the same window read against the recombinant row: a pale cell where a row
    // carries the same base, a colored one where it carries another. The two
    // parent rows take opposite halves of the window.
    viewportWidth: 1600,
    url: fileSnap({
      ...scanView(layers.recombinantTracks),
      height: 380,
      rowHeight: 34,
      relativeTo: CHILD,
      columnTracks: [],
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: {
          col: 0,
          colEnd: anchorCol(breakpoint.firstWindowColumn),
          rowLabel: 'BJ.1',
        },
        pad: 2,
      },
      {
        type: 'box',
        anchor: {
          col: anchorCol(breakpoint.lastWindowColumn),
          colEnd: windowColumns - 3,
          rowLabel: 'BM.1.1.1',
        },
        pad: 2,
      },
      {
        type: 'text',
        // the pill grows left from the right edge of the frame, which a pill
        // centered on this half of the window would run past
        textAlign: 'end',
        text: `BM.1.1.1 differs at ${bmRight.length} of the ${windowColumns - breakpoint.lastWindowColumn + 1} columns right of the break`,
        fontSize: 16,
        maxWidth: 300,
        anchor: {
          col: anchorCol(breakpoint.lastWindowColumn),
          colEnd: windowColumns - 1,
          rowLabel: 'BM.1.1.1',
          alignX: 'right',
          alignY: 'top',
          dx: -16,
          dy: -26,
        },
      },
      {
        type: 'text',
        text: `BJ.1 differs at ${bjLeft.length} of the ${breakpoint.firstWindowColumn} left of it`,
        fontSize: 16,
        maxWidth: 440,
        anchor: {
          col: 0,
          colEnd: anchorCol(breakpoint.firstWindowColumn),
          rowLabel: 'BJ.1',
          alignY: 'bottom',
          dy: 36,
        },
      },
    ],
  },
  {
    name: 'recombination_breakpoint-5',
    // the breakpoint at base resolution, on the genome alignment: the last
    // three sites the recombinant takes from one parent and the first three it
    // takes from the other
    viewportWidth: 1600,
    url: fileSnap({
      height: 420,
      treeAreaWidth: TREE,
      colWidth: BASE_WIDTH,
      rowHeight: 30,
      scrollX: -(breakpoint.firstColumn - 12) * BASE_WIDTH,
      colorSchemeName: 'nucleotide',
      relativeTo: CHILD,
      ...genome,
      // no label on the band: at this column width its pill would cover the
      // first row's base at 22896, which is one of the six the figure is for
      highlights: [
        {
          start: breakpoint.firstColumn,
          end: breakpoint.lastColumn,
          color: 'rgba(0,0,0,0.18)',
        },
      ],
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `XBB.1 takes ${breakpoint.referenceStart} from BJ.1 and ${breakpoint.referenceEnd} from BM.1.1.1`,
        fontSize: 16,
        maxWidth: 460,
        anchor: {
          col: anchorCol(breakpoint.firstColumn),
          colEnd: anchorCol(breakpoint.lastColumn),
          alignY: 'bottom',
          dy: 44,
        },
      },
    ],
  },
]
