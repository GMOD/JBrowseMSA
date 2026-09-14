// Figures for docs/tutorials/kinase_pocket.md: the human kinase family's ATP
// pocket, read off a hmmalign/FastTree alignment of 474 kinase domains hosted
// at packages/app/public/data/kinase-pocket/.
import { fileSnap } from '../snap.mjs'

const FILES = {
  msaFilehandle: { uri: 'data/kinase-pocket/kinase-pocket.afa' },
  treeFilehandle: { uri: 'data/kinase-pocket/kinase-pocket.nwk' },
  treeMetadataFilehandle: {
    uri: 'data/kinase-pocket/kinase-pocket-metadata.json',
  },
}

// landmark columns, read off ABL1 in the hosted alignment: catalytic lysine
// K271, gatekeeper T315, the DFG motif (D381-F382-G383). See "Read off the
// pocket" in the tutorial for how these were found. There they are 1-based
// (col 30, 77, 141-143), the highlights/GFF convention used elsewhere in this
// viewer. Annotation anchors are 0-based, since `col * colWidth` is a raw pixel
// offset, so every constant below is that 1-based column minus one.
const CAT_LYS = 29
const GATEKEEPER = 76
const DFG_START = 140
const DFG_END = 142
const CONTROL = 101

export const specs = [
  {
    name: 'kinase-pocket-family',
    // whole family, whole domain: colWidth/rowHeight small enough that all
    // 474 rows and all 262 columns fit in one frame, so the shape of the
    // tree (kinase groups clustering into bands) and the shared Pkinase
    // block are visible. No labels draw at this scale.
    viewportWidth: 1400,
    viewportHeight: 1040,
    url: fileSnap({
      height: 960,
      treeAreaWidth: 110,
      colWidth: 4.6,
      rowHeight: 2,
      drawLabels: false,
      colorSchemeName: 'clustalx_protein_dynamic',
      ...FILES,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'kinase-pocket-logo',
    // same 474 rows, now with the sequence logo on (a turnedOffTracks value
    // of false turns on a track that is hidden by default) and the pocket's
    // three landmark columns
    // plus one non-conserved control column called out. The logo and the
    // conservation track both summarize all 474 rows regardless of how few
    // pixels each row gets on screen.
    viewportWidth: 1400,
    viewportHeight: 560,
    url: fileSnap({
      height: 480,
      treeAreaWidth: 110,
      colWidth: 4.6,
      rowHeight: 2,
      drawLabels: false,
      colorSchemeName: 'clustalx_protein_dynamic',
      turnedOffTracks: { 'sequence-logo': false },
      // persisted bands under the four called-out columns, in 1-based
      // alignment coordinates (unlike the annotation anchors below, which
      // are 0-based pixel offsets), so the live link shows the same four
      // columns the screenshot's callouts point at
      highlights: [
        {
          start: 30,
          end: 30,
          label: 'catalytic K',
          color: 'rgba(21,101,192,0.25)',
        },
        {
          start: 77,
          end: 77,
          label: 'gatekeeper',
          color: 'rgba(227,36,43,0.25)',
        },
        { start: 141, end: 143, label: 'DFG', color: 'rgba(46,125,50,0.25)' },
        {
          start: 102,
          end: 102,
          label: 'control',
          color: 'rgba(117,117,117,0.25)',
        },
      ],
      ...FILES,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: CAT_LYS, alignY: 'top' },
        color: '#1565c0',
        pad: 3,
      },
      {
        type: 'text',
        text: 'K, 93.5%',
        color: '#1565c0',
        fontSize: 16,
        anchor: { col: CAT_LYS, alignY: 'top', dy: -14 },
      },
      {
        type: 'box',
        anchor: { col: GATEKEEPER, alignY: 'top' },
        color: '#e3242b',
        pad: 3,
      },
      {
        type: 'text',
        text: 'gatekeeper, T in 19%',
        color: '#e3242b',
        fontSize: 16,
        anchor: { col: GATEKEEPER, alignY: 'top', dy: -38 },
      },
      {
        type: 'box',
        anchor: { col: DFG_START, colEnd: DFG_END, alignY: 'top' },
        color: '#2e7d32',
        pad: 3,
      },
      {
        type: 'text',
        text: 'DFG',
        color: '#2e7d32',
        fontSize: 16,
        anchor: { col: DFG_START, colEnd: DFG_END, alignY: 'top', dy: -14 },
      },
      {
        type: 'box',
        anchor: { col: CONTROL, alignY: 'top' },
        color: '#757575',
        pad: 3,
      },
      {
        type: 'text',
        text: 'not conserved',
        color: '#757575',
        fontSize: 16,
        anchor: { col: CONTROL, alignY: 'top', dy: -38 },
      },
    ],
  },
  {
    name: 'kinase-pocket-gatekeeper-abl',
    part: true,
    // ABL1 and ABL2, the Abl family imatinib was built against: both carry
    // the small threonine gatekeeper the drug's methylpiperazine arm reaches
    // past to a back pocket only a small gatekeeper leaves open.
    viewportWidth: 1100,
    viewportHeight: 300,
    url: fileSnap({
      height: 280,
      treeAreaWidth: 110,
      colWidth: 34,
      rowHeight: 46,
      colorSchemeName: 'clustalx_protein_dynamic',
      // both tracks summarize all 474 rows, not the two visible here, so
      // they are off
      turnedOffTracks: { conservation: true, 'property-conservation': true },
      scrollX: -(GATEKEEPER - 8) * 34,
      // ABL1/ABL2 are rows 101/102 of the 474-leaf FastTree order (found by
      // reading window.MSAVIEW_MODEL.leaves in a render; the app's tip order
      // is neither the input file's nor alphabetical)
      scrollY: -101 * 46,
      ...FILES,
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: GATEKEEPER, rowLabel: 'ABL1', rowLabelEnd: 'ABL2' },
        color: '#e3242b',
      },
      {
        type: 'text',
        text: 'T315 (ABL1 numbering)',
        color: '#e3242b',
        fontSize: 18,
        anchor: { col: GATEKEEPER, rowLabel: 'ABL1', alignY: 'top', dy: -18 },
      },
    ],
  },
  {
    name: 'kinase-pocket-gatekeeper-cdk',
    part: true,
    // CDK1-3: the same column, same colWidth/scrollX as the Abl pair above,
    // a different row band. CDKs are not imatinib targets, and the bulky
    // phenylalanine here is a structural reason why: it fills the pocket a
    // small gatekeeper leaves open.
    viewportWidth: 1100,
    viewportHeight: 340,
    url: fileSnap({
      height: 320,
      treeAreaWidth: 110,
      colWidth: 34,
      rowHeight: 46,
      colorSchemeName: 'clustalx_protein_dynamic',
      turnedOffTracks: { conservation: true, 'property-conservation': true },
      scrollX: -(GATEKEEPER - 8) * 34,
      // CDK2/CDK3/CDK1 are rows 261-263, adjacent in that order (not
      // numeric order) in the FastTree tip layout
      scrollY: -261 * 46,
      ...FILES,
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: GATEKEEPER, rowLabel: 'CDK2', rowLabelEnd: 'CDK1' },
        color: '#e3242b',
      },
      {
        type: 'text',
        text: 'same column, CDK1/2/3',
        color: '#e3242b',
        fontSize: 18,
        anchor: { col: GATEKEEPER, rowLabel: 'CDK2', alignY: 'top', dy: -18 },
      },
    ],
  },
  {
    name: 'kinase-pocket-gatekeeper',
    parts: ['kinase-pocket-gatekeeper-abl', 'kinase-pocket-gatekeeper-cdk'],
  },
]
