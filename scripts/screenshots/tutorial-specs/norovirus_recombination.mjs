/**
 * Figures for docs/tutorials/norovirus_recombination.md: twelve norovirus GII
 * genomes, the ORF1 and ORF2 trees they give, each genome's closer parent in
 * 200-base windows, and the two sliding-window identity tracks that change
 * rank at the ORF1/ORF2 junction.
 *
 * The spec reads every column, row name and track from the files the build
 * script wrote (packages/app/public/data/norovirus), so a re-run that moves the
 * breakpoint moves the callouts with it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileSnap } from '../snap.mjs'

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/app/public/data/norovirus',
)
const read = name => fs.readFileSync(path.join(dataDir, name), 'utf8')

const layers = JSON.parse(read('noro-layers.json'))
const alignedColumns = read('noro.afa').split('\n')[1].length
const { columns, query, control, crossColumn } = layers
const [queryA, queryB, controlA, controlB] = layers.columnTracks

const files = {
  msaFilehandle: { uri: 'data/norovirus/noro.afa' },
  treeFilehandle: { uri: 'data/norovirus/noro-orf2.nwk' },
}
const orfs = { gffFilehandle: { uri: 'data/norovirus/noro-orfs.gff' } }
const parents = { gffFilehandle: { uri: 'data/norovirus/noro-parents.gff' } }

// one color per ORF and one per parent, the maps the page's links carry
const orfFill = {
  channel: 'featureFill',
  field: 'Name',
  scale: { map: { ORF1: '#4e79a7', ORF2: '#e15759', ORF3: '#8c8c8c' } },
}
const parentFill = {
  channel: 'featureFill',
  field: 'Name',
  scale: {
    map: {
      'GII.P16': '#4e79a7',
      'GII.4 Sydney': '#e15759',
      tie: '#bab0ac',
    },
  },
}

// 7,778 columns across the alignment panel a 1600px viewport leaves beside a
// 300px tree area. The height leaves a band under the twelve rows for the
// callouts, which anchor on the bottom of the drawn rows
const WHOLE = 0.162
const whole = {
  height: 500,
  treeAreaWidth: 300,
  rowHeight: 24,
  colWidth: WHOLE,
  ...files,
}

// the junction cut: 600 columns of its own file, so a track value per column
// fits the link
const junctionFiles = {
  msaFilehandle: { uri: 'data/norovirus/noro-junction.afa' },
  treeFilehandle: { uri: 'data/norovirus/noro-orf2.nwk' },
}
const CUT = 2.1
// the first base of ORF2 and the crossing, in the cut's own columns
const cutOrf2 = columns.orf2[0] - columns.junction[0] + 1
const cutCross = crossColumn - columns.junction[0] + 1
const junction = {
  height: 620,
  treeAreaWidth: 300,
  rowHeight: 24,
  colWidth: CUT,
  ...junctionFiles,
  highlights: [{ start: cutOrf2, end: cutOrf2, label: 'ORF2 starts' }],
}

// the residue close-up around the crossing, with every row read against the
// recombinant: a dot is the same base
const CLOSE = 15
const closeUp = {
  height: 560,
  treeAreaWidth: 300,
  rowHeight: 26,
  colWidth: CLOSE,
  relativeTo: query,
  scrollX: Math.round(-(crossColumn - 1 - 44) * CLOSE),
  ...files,
}

export const specs = [
  {
    name: 'norovirus_recombination-1',
    // the twelve genomes and the ORF2 tree, no annotation loaded
    viewportWidth: 1600,
    url: fileSnap(whole),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `${alignedColumns} columns of aligned genome`,
        fontSize: 16,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 20 },
      },
    ],
  },
  {
    name: 'norovirus_recombination-2',
    // the three ORFs of every genome, in that genome's own coordinates
    viewportWidth: 1600,
    url: fileSnap({ ...whole, ...orfs, encodings: [orfFill] }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `ORF1 ends at column ${columns.orf1[1]}, ORF2 starts at ${columns.orf2[0]}`,
        fontSize: 16,
        maxWidth: 520,
        anchor: {
          col: columns.orf2[0] - 1,
          alignX: 'left',
          alignY: 'bottom',
          dy: 20,
        },
      },
    ],
  },
  {
    name: 'norovirus_recombination-3',
    // the same alignment under the ORF1 tree: the recombinants sit with the
    // GII.P16-GII.2 rows
    viewportWidth: 1600,
    url: fileSnap({
      ...whole,
      treeFilehandle: { uri: 'data/norovirus/noro-orf1.nwk' },
      ...orfs,
      encodings: [orfFill],
      showDomainLegend: false,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'norovirus_recombination-4',
    // every row's closer parent in 200-base windows: the recombinants read
    // blue then red, the control reads red throughout
    viewportWidth: 1600,
    url: fileSnap({
      ...whole,
      ...parents,
      encodings: [parentFill],
      highlights: [
        { start: crossColumn, end: crossColumn, label: 'breakpoint' },
      ],
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `${query}: blue to column ${crossColumn}, red after it`,
        fontSize: 16,
        maxWidth: 540,
        anchor: {
          col: 0,
          rowLabel: query,
          alignX: 'left',
          alignY: 'bottom',
          dy: 40,
        },
      },
      {
        type: 'arrow',
        fromAnchor: {
          col: 1800,
          rowLabel: query,
          alignX: 'left',
          alignY: 'bottom',
          dy: 34,
        },
        anchor: { col: crossColumn - 1, rowLabel: query, alignY: 'bottom' },
      },
    ],
  },
  {
    name: 'norovirus_recombination-5',
    // the two identity tracks of the recombinant across the junction cut
    viewportWidth: 1600,
    url: fileSnap({ ...junction, columnTracks: [queryA, queryB] }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `the two curves change rank at column ${cutCross} of the cut, ${crossColumn} of the alignment`,
        fontSize: 16,
        maxWidth: 560,
        anchor: {
          col: cutCross - 1,
          alignX: 'left',
          alignY: 'bottom',
          dy: 40,
        },
      },
    ],
  },
  {
    name: 'norovirus_recombination-6',
    // the control: the same two tracks for a row whose genome came from one
    // lineage end to end
    viewportWidth: 1600,
    url: fileSnap({ ...junction, columnTracks: [controlA, controlB] }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `${control}: the two curves hold their rank across the cut`,
        fontSize: 16,
        maxWidth: 560,
        anchor: { col: 20, alignX: 'left', alignY: 'bottom', dy: 40 },
      },
    ],
  },
  {
    name: 'norovirus_recombination-7',
    // the bases themselves, every row read against the recombinant
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp,
      highlights: [{ start: crossColumn, end: crossColumn }],
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: crossColumn - 1 },
        pad: 3,
      },
      {
        type: 'text',
        text: `column ${crossColumn}`,
        fontSize: 16,
        maxWidth: 260,
        anchor: {
          col: crossColumn - 1,
          alignX: 'left',
          alignY: 'bottom',
          dy: 44,
        },
      },
    ],
  },
  {
    name: 'norovirus_recombination-8',
    // what the link at the end of the page opens
    viewportWidth: 1600,
    url: fileSnap({
      ...whole,
      ...parents,
      encodings: [parentFill],
      highlights: [
        {
          start: columns.orf2[0],
          end: columns.orf2[1],
          label: 'ORF2',
          color: 'rgba(0,0,0,0.07)',
        },
        { start: crossColumn, end: crossColumn, label: 'breakpoint' },
      ],
    }),
    settle: 2500,
    clip: 'viewer',
  },
]
