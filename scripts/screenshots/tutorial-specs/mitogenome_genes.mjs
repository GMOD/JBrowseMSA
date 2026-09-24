// Figures for docs/tutorials/mitogenome_genes.md: eight mammal mitochondrial
// genomes as one alignment, with RefSeq's genes drawn as strand arrows colored
// by respiratory complex.
//
// Every figure loads the hosted copies of the files the tutorial's build script
// writes (data/mitogenome/*), so a figure and the #data= link under it open the
// same view. Callouts anchor on alignment columns and row labels, never pixels.

import { fileSnap } from '../snap.mjs'

const files = {
  msaFilehandle: { uri: 'data/mitogenome/mito.afa' },
  treeFilehandle: { uri: 'data/mitogenome/mito.nwk' },
  gffFilehandle: { uri: 'data/mitogenome/mito-genes.gff' },
}

// One color per respiratory complex, the map the tutorial's #data= links carry.
// Key order is legend order, and a value the features never take draws nothing.
const complexFill = {
  channel: 'featureFill',
  field: 'complex',
  scale: {
    map: {
      I: '#4e79a7',
      III: '#59a14f',
      IV: '#e15759',
      V: '#b07aa1',
      rRNA: '#f28e2b',
      tRNA: '#bab0ac',
    },
  },
}
const nameLabel = { channel: 'featureLabel', field: 'Name' }

// Columns the build script prints. 1-based as the viewer's header shows them;
// the anchors below are 0-based, the arithmetic MSACanvasBlock uses.
const COX1_START = 6133
const COX1_END = 7678
// ATP6 ends at column 9449, the right edge of the step-5 window
const ND6_START = 14408
const CYTB_END = 16160

// 17,966 columns across the alignment panel a 1600px viewport leaves beside a
// 190px tree area, stopping short of the legend the overlay draws top right
const WHOLE = 0.065
// the COX1..ATP6 window and the ND6..control-region window in the same panel
const GENE_ZOOM = 0.38
const END_ZOOM = 0.363

export const specs = [
  {
    name: 'mitogenome_genes-1',
    // The genomes as fetched, padded to a common width. Row order is the
    // file's, since no tree is loaded.
    viewportWidth: 1600,
    url: fileSnap({
      height: 300,
      treeAreaWidth: 190,
      rowHeight: 18,
      colWidth: WHOLE,
      msaFilehandle: { uri: 'data/mitogenome/mito-unaligned.afa' },
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'unaligned: each row is its own genome, 16,299 to 17,019 bp',
        fontSize: 16,
        maxWidth: 620,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 18 },
      },
    ],
  },
  {
    name: 'mitogenome_genes-2',
    // The alignment and the ClustalW tree, with no annotation file loaded.
    viewportWidth: 1600,
    url: fileSnap({
      height: 300,
      treeAreaWidth: 190,
      rowHeight: 18,
      colWidth: WHOLE,
      msaFilehandle: files.msaFilehandle,
      treeFilehandle: files.treeFilehandle,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: '17,966 columns',
        fontSize: 16,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 18 },
      },
    ],
  },
  {
    name: 'mitogenome_genes-3',
    // The derived GFF over the alignment with no encoding named, so every gene
    // takes the color its Name draws in the accession palette.
    viewportWidth: 1600,
    url: fileSnap({
      height: 300,
      treeAreaWidth: 190,
      rowHeight: 18,
      colWidth: WHOLE,
      showDomainLegend: false,
      ...files,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'mitogenome_genes-4',
    // featureFill over complex, with the whole genome in the frame: six colors,
    // a legend titled by the field, and the control region in its own color=.
    viewportWidth: 1600,
    url: fileSnap({
      height: 300,
      treeAreaWidth: 190,
      rowHeight: 18,
      colWidth: WHOLE,
      encodings: [complexFill, nameLabel],
      ...files,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'ND6 points left in every row',
        fontSize: 16,
        maxWidth: 320,
        anchor: {
          col: 11800,
          rowLabel: 'Dog',
          alignX: 'left',
          alignY: 'bottom',
          dy: 34,
        },
      },
      {
        type: 'arrow',
        fromAnchor: {
          col: 13900,
          rowLabel: 'Dog',
          alignX: 'left',
          alignY: 'bottom',
          dy: 30,
        },
        anchor: {
          col: 14550,
          rowLabel: 'Dog',
          alignY: 'bottom',
        },
      },
    ],
  },
  {
    name: 'mitogenome_genes-5',
    // COX1 to ATP6 at a column width where featureLabel fits inside the longer
    // arrows. scrollX is a negative pixel offset: the column at the left edge.
    viewportWidth: 1600,
    viewportHeight: 560,
    url: fileSnap({
      height: 380,
      treeAreaWidth: 190,
      rowHeight: 26,
      colWidth: GENE_ZOOM,
      scrollX: Math.round(-(COX1_START - 34) * GENE_ZOOM),
      encodings: [complexFill, nameLabel],
      ...files,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'tRNA-Lys: 70 columns, too narrow for its label',
        fontSize: 15,
        maxWidth: 480,
        anchor: {
          col: 6400,
          rowLabel: 'Dog',
          alignX: 'left',
          alignY: 'bottom',
          dy: 36,
        },
      },
      {
        type: 'arrow',
        fromAnchor: {
          col: 7900,
          rowLabel: 'Dog',
          alignX: 'left',
          alignY: 'bottom',
          dy: 30,
        },
        anchor: {
          col: 8530,
          rowLabel: 'Dog',
          alignY: 'bottom',
        },
      },
    ],
  },
  {
    name: 'mitogenome_genes-6',
    // The 3' end of the alignment: CYTB ending in one column across the rows,
    // and the control region ending in eight different ones.
    viewportWidth: 1600,
    viewportHeight: 560,
    url: fileSnap({
      height: 380,
      treeAreaWidth: 190,
      rowHeight: 26,
      colWidth: END_ZOOM,
      scrollX: Math.round(-(ND6_START - 150) * END_ZOOM),
      showDomainLegend: false,
      encodings: [complexFill, nameLabel],
      ...files,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'CYTB ends in one column; the control region ends in eight',
        fontSize: 15,
        maxWidth: 560,
        anchor: {
          col: ND6_START,
          alignX: 'left',
          alignY: 'bottom',
          dy: 36,
        },
      },
      {
        type: 'arrow',
        fromAnchor: {
          col: CYTB_END - 500,
          alignX: 'left',
          alignY: 'bottom',
          dy: 30,
        },
        anchor: { col: CYTB_END, alignY: 'bottom' },
      },
    ],
  },
  {
    name: 'mitogenome_genes-7',
    // What the #data= link at the end of the page opens: the three hosted
    // files, the two encodings, and a labeled band over the COX1 columns.
    viewportWidth: 1600,
    url: fileSnap({
      height: 300,
      treeAreaWidth: 190,
      rowHeight: 18,
      colWidth: WHOLE,
      encodings: [complexFill, nameLabel],
      highlights: [{ start: COX1_START + 1, end: COX1_END + 1, label: 'COX1' }],
      ...files,
    }),
    settle: 2500,
    clip: 'viewer',
  },
]
