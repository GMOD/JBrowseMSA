// Figures for docs/tutorials/rna_family.md: SAM-I riboswitches found in six
// Firmicute genomes with cmsearch, aligned to the Rfam RF00162 model, and read
// for the base pairs the alignment keeps.
//
// Column numbers come from the last step of
// docs/tutorials/scripts/build_rna_family.sh, which prints them 1-based; the
// anchors here are 0-based, so each runs one lower. No column of this alignment
// is all gaps, so a visible column is its own alignment column and the anchors
// need no gap arithmetic.
//
// `height` is the model's, and it has to cover the tracks above the alignment
// plus 37 rows plus room for a callout pill under the last one: a short panel
// drops the bottom rows and parks a bottom-anchored pill off the frame.

import { fileSnap } from '../snap.mjs'

const msa = { uri: 'data/rna/sam-riboswitch.sto' }
const RED = '#e3242b'
const BLUE = '#1565c0'
const ROWS = 37

function view(extra) {
  return fileSnap({
    treeAreaWidth: 240,
    colWidth: 8,
    rowHeight: 15,
    colorSchemeName: 'nucleotide',
    msaFilehandle: msa,
    height: 150 + ROWS * 15 + 40,
    ...extra,
  })
}

// A zoom onto one span: `firstCol` (1-based) sits at the left edge of the
// frame, and the minimap the zoom turns on takes another 55px of chrome.
function zoom(firstCol, extra) {
  const colWidth = extra.colWidth ?? 26
  const rowHeight = 17
  return view({
    colWidth,
    rowHeight,
    height: 245 + ROWS * rowHeight + 70,
    scrollX: -(firstCol - 1) * colWidth,
    ...extra,
  })
}

export const specs = [
  {
    name: 'rna-family-overview',
    url: view({}),
    viewportWidth: 1800,
    viewportHeight: 900,
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'rna-family-pseudoknot',
    url: view({}),
    viewportWidth: 1800,
    viewportHeight: 900,
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        // the blank band is the variable P3 stem-loop, where only five rows
        // carry residues, so a pill there covers no data
        type: 'text',
        text: 'the red arc: columns 28-31 pair with 147-153, crossing every helix between them',
        fontSize: 16,
        maxWidth: 300,
        color: RED,
        anchor: { col: 78, rowLabel: 'Lmon_metK', rowLabelEnd: 'Cace_metK' },
      },
      {
        type: 'arrow',
        color: RED,
        fromAnchor: {
          col: 88,
          rowLabel: 'Lmon_metK',
          rowLabelEnd: 'Cace_metK',
          alignY: 'top',
        },
        anchor: { col: 92, alignY: 'top', dy: -66 },
      },
    ],
  },
  {
    name: 'rna-family-helix',
    // P2: columns 13-46. The pair at 18/41 is complementary in all 37 rows and
    // is four different base pairs; columns 35-40 next to it are unpaired
    url: zoom(13, {}),
    viewportWidth: 1200,
    viewportHeight: 1060,
    settle: 2500,
    clip: 'viewer',
    annotations: [
      { type: 'box', anchor: { col: 17 }, pad: 2, color: RED, strokeWidth: 3 },
      { type: 'box', anchor: { col: 40 }, pad: 2, color: RED, strokeWidth: 3 },
      {
        type: 'box',
        anchor: { col: 34, colEnd: 35 },
        pad: 2,
        color: BLUE,
        strokeWidth: 3,
      },
      {
        type: 'text',
        text: 'columns 18 and 41: four different base pairs over the 37 rows, and a pair in every one of them',
        fontSize: 15,
        maxWidth: 340,
        color: RED,
        anchor: { col: 17, alignX: 'left', alignY: 'bottom', dy: 36 },
      },
      {
        type: 'text',
        text: 'columns 35 and 36: just as variable, unpaired, and no column in the alignment pairs with them above 76%',
        fontSize: 15,
        maxWidth: 300,
        color: BLUE,
        anchor: { col: 30, alignX: 'left', alignY: 'top', dy: -40 },
      },
    ],
  },
  {
    name: 'rna-family-sam',
    // the seven columns Rfam marks as SAM contacts, as labeled highlights, with
    // the sequence logo on to show how little they vary
    url: view({
      height: 200 + ROWS * 15 + 40,
      turnedOffTracks: { 'sequence-logo': false },
      highlights: [
        { start: 7, end: 7, label: 'SAM' },
        { start: 11, end: 11, label: 'SAM' },
        { start: 50, end: 50, label: 'SAM' },
        { start: 139, end: 141, label: 'SAM' },
        { start: 182, end: 182, label: 'SAM' },
      ],
    }),
    viewportWidth: 1800,
    viewportHeight: 940,
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'rna-family-frozen-pair',
    // the 3' half of the SAM-contact pairs: columns 137-142 pair back with
    // 47-53, and the three the ligand touches are one base pair in every row
    url: zoom(133, { colWidth: 30 }),
    viewportWidth: 1200,
    viewportHeight: 1060,
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: 138, colEnd: 140 },
        pad: 2,
        color: RED,
        strokeWidth: 3,
      },
      {
        type: 'text',
        text: 'columns 139-141 touch SAM: UGC in 36 of the 37 rows, and their partners at 48-50 are GCA in 35',
        fontSize: 15,
        maxWidth: 360,
        color: RED,
        anchor: { col: 138, alignX: 'left', alignY: 'bottom', dy: 36 },
      },
    ],
  },
  {
    name: 'rna-family-tree',
    // the tree the alignment produced, with the two B. subtilis rows that lead
    // tandem paralogs tinted
    url: view({
      treeAreaWidth: 330,
      colWidth: 3,
      rowHeight: 17,
      height: 150 + ROWS * 17 + 40,
      highlights: [
        {
          rows: ['Bsub_yxjG', 'Bsub_yxjH'],
          color: 'rgba(21,101,192,0.18)',
        },
      ],
    }),
    viewportWidth: 1200,
    viewportHeight: 940,
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'the yxjG and yxjH riboswitches sit 1.4 kb apart in B. subtilis, and the tree puts them together',
        fontSize: 15,
        maxWidth: 300,
        color: BLUE,
        anchor: {
          col: 30,
          rowLabel: 'Bsub_yxjH',
          rowLabelEnd: 'Bsub_yxjG',
          alignX: 'left',
          dx: 40,
        },
      },
    ],
  },
]
