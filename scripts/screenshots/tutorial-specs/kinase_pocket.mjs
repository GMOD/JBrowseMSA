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

// alignment columns (1-based) landmark residues sit at, read off ABL1 in the
// hosted alignment: catalytic lysine K271 at col 30, gatekeeper T315 at col
// 77, the DFG motif (D381-F382-G383) at cols 141-143. See "Read off the
// pocket" in the tutorial for how these were found.
const CAT_LYS = 30
const GATEKEEPER = 77
const DFG_START = 141
const DFG_END = 143
const CONTROL = 102

export const specs = [
  {
    name: 'kinase-pocket-family',
    // whole family, whole domain: colWidth/rowHeight small enough that all
    // 474 rows and all 262 columns fit in one frame, so the shape of the
    // tree (kinase groups clustering into bands) and the shared Pkinase
    // block read at a glance. No labels at this scale -- the point is the
    // silhouette, not any one row.
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
    // same 474 rows, now with the sequence logo on (turnedOffTracks holds
    // the user's explicit choice, so `false` switches a track that ships
    // hidden by default back on) and the pocket's three landmark columns
    // plus one non-conserved control column called out. The logo and the
    // conservation track both read across the full 474 rows regardless of
    // how few pixels each row gets on screen.
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
        text: 'catalytic K · 93.5%',
        color: '#1565c0',
        fontSize: 16,
        anchor: {
          col: CAT_LYS,
          alignY: 'top',
          alignX: 'left',
          dy: -14,
        },
      },
      {
        type: 'box',
        anchor: { col: GATEKEEPER, alignY: 'top' },
        color: '#e3242b',
        pad: 3,
      },
      {
        type: 'text',
        text: 'gatekeeper · T in 19%',
        color: '#e3242b',
        fontSize: 16,
        anchor: { col: GATEKEEPER, alignY: 'top', dy: -14 },
      },
      {
        type: 'box',
        anchor: { col: DFG_START, colEnd: DFG_END, alignY: 'top' },
        color: '#2e7d32',
        pad: 3,
      },
      {
        type: 'text',
        text: 'DFG motif',
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
        text: 'control · not conserved',
        color: '#757575',
        fontSize: 16,
        anchor: {
          col: CONTROL,
          alignY: 'top',
          alignX: 'right',
          dy: -14,
        },
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
    viewportHeight: 260,
    url: fileSnap({
      height: 220,
      treeAreaWidth: 110,
      colWidth: 34,
      rowHeight: 46,
      colorSchemeName: 'clustalx_protein_dynamic',
      scrollX: -(GATEKEEPER - 8) * 34,
      scrollY: -339 * 46,
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
    viewportHeight: 300,
    url: fileSnap({
      height: 260,
      treeAreaWidth: 110,
      colWidth: 34,
      rowHeight: 46,
      colorSchemeName: 'clustalx_protein_dynamic',
      scrollX: -(GATEKEEPER - 8) * 34,
      scrollY: -194 * 46,
      ...FILES,
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: GATEKEEPER, rowLabel: 'CDK1', rowLabelEnd: 'CDK3' },
        color: '#e3242b',
      },
      {
        type: 'text',
        text: 'same column, CDK1-3',
        color: '#e3242b',
        fontSize: 18,
        anchor: { col: GATEKEEPER, rowLabel: 'CDK1', alignY: 'top', dy: -18 },
      },
    ],
  },
  {
    name: 'kinase-pocket-gatekeeper',
    parts: ['kinase-pocket-gatekeeper-abl', 'kinase-pocket-gatekeeper-cdk'],
  },
]
