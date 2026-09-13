// Figures for docs/tutorials/protein_family.md: twelve NLRP1 orthologs from
// UniProt accessions to an alignment, a tree and a Pfam overlay.
//
// Every figure loads the hosted copies of the three files the tutorial's build
// script writes (data/nlrp1.aln, data/nlrp1.nh, data/nlrp1-domains.gff), so a
// figure and the ?data= link under it open the same view. Callouts anchor on
// alignment columns and row labels, never pixels.

import { fileSnap } from '../snap.mjs'

// 1-based display columns are what the viewer's header shows; the anchors below
// are 0-based, the same arithmetic MSACanvasBlock uses.
const PYD_START = 38
const PYD_END = 112
const NACHT_START = 370
const NACHT_END = 542

const files = {
  msaFilehandle: { uri: 'data/nlrp1.aln' },
  treeFilehandle: { uri: 'data/nlrp1.nh' },
  gffFilehandle: { uri: 'data/nlrp1-domains.gff' },
}

// Every accession in nlrp1-domains.gff except the pyrin domain, so a snapshot
// can open with the overlay reduced to the one domain the page is about
// (initFilter only fills in accessions the snapshot has not already set).
const NON_PYD = [
  'IPR001315',
  'IPR001611',
  'IPR007111',
  'IPR025307',
  'IPR041075',
  'IPR041267',
]

export const specs = [
  {
    name: 'protein-family-sequences',
    // The twelve sequences before alignment, right-padded to a common length so
    // the viewer takes them as a block. Column 100 is residue 100 in every row
    // and means nothing across rows: the ragged right edge is each protein's
    // own length, 1143 to 1537.
    viewportWidth: 1400,
    url: fileSnap({
      height: 360,
      treeAreaWidth: 150,
      colWidth: 0.76,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/nlrp1-unaligned.aln' },
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'unaligned: every row starts at residue 1 and ends at its own length',
        fontSize: 16,
        maxWidth: 620,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 34 },
      },
    ],
  },
  {
    name: 'protein-family-aligned',
    // The same twelve after ClustalW: 1666 columns, gaps inserted, and the
    // conserved core reading as vertical bands of color.
    viewportWidth: 1400,
    url: fileSnap({
      height: 360,
      treeAreaWidth: 150,
      colWidth: 0.7,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/nlrp1.aln' },
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'aligned: 1666 columns, gaps where the aligner made room',
        fontSize: 16,
        maxWidth: 620,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 34 },
      },
    ],
  },
  {
    name: 'protein-family-tree',
    // The tree loaded beside the same alignment. Rows leave file order for tree
    // order, which puts the three rodents together and the three primates
    // together.
    viewportWidth: 1400,
    url: fileSnap({
      height: 400,
      treeAreaWidth: 190,
      colWidth: 0.7,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/nlrp1.aln' },
      treeFilehandle: { uri: 'data/nlrp1.nh' },
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: {
          col: 0,
          colEnd: 24,
          rowLabel: 'Chimp',
          rowLabelEnd: 'Rhesus',
        },
        color: '#1565c0',
        pad: 3,
      },
      {
        type: 'text',
        text: 'primates',
        fontSize: 16,
        color: '#1565c0',
        anchor: {
          col: 30,
          rowLabel: 'Chimp',
          rowLabelEnd: 'Rhesus',
          alignX: 'left',
        },
      },
      {
        type: 'box',
        anchor: {
          col: 0,
          colEnd: 24,
          rowLabel: 'Mouse',
          rowLabelEnd: 'Hamster',
        },
        pad: 3,
      },
      {
        type: 'text',
        text: 'rodents',
        fontSize: 16,
        anchor: {
          col: 30,
          rowLabel: 'Mouse',
          rowLabelEnd: 'Hamster',
          alignX: 'left',
        },
      },
    ],
  },
  {
    name: 'protein-family-collapsed',
    // The rodent clade collapsed to a triangle. Node ids are deterministic from
    // generateNodeIds (msa-parsers/src/util.ts): root 'node-0', each child
    // appends '-<index>-<depth>', so ((Mouse,Rat),Hamster) is the id below.
    viewportWidth: 1400,
    url: fileSnap({
      height: 320,
      treeAreaWidth: 190,
      colWidth: 0.7,
      collapsed: ['node-0-0-1-0-2-0-3'],
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/nlrp1.aln' },
      treeFilehandle: { uri: 'data/nlrp1.nh' },
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      // the collapsed node draws as one row whose label is its node id, so it
      // is anchorable like any other row
      {
        type: 'text',
        text: 'Mouse, Rat and Hamster, in one row',
        fontSize: 16,
        anchor: {
          col: 120,
          rowLabel: 'node-0-0-1-0-2-0-3',
          alignX: 'left',
        },
      },
      {
        type: 'arrow',
        fromAnchor: {
          col: 118,
          rowLabel: 'node-0-0-1-0-2-0-3',
          alignX: 'left',
        },
        anchor: {
          col: 2,
          rowLabel: 'node-0-0-1-0-2-0-3',
          alignX: 'left',
        },
      },
    ],
  },
  {
    name: 'protein-family-domains',
    // The payoff view: alignment, tree and Pfam overlay together. Six domains
    // in all twelve rows, in the same columns; the PYD in five rows only.
    // Viewport is wide enough that 1666 columns end left of the legend, which
    // is absolutely positioned top-right.
    viewportWidth: 1600,
    url: fileSnap({
      height: 370,
      treeAreaWidth: 150,
      colWidth: 0.7,
      colorSchemeName: 'clustalx_protein_dynamic',
      ...files,
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      { type: 'box', anchor: { col: PYD_START, colEnd: PYD_END }, pad: 3 },
      {
        type: 'box',
        anchor: { col: NACHT_START, colEnd: NACHT_END },
        color: '#1565c0',
        pad: 3,
      },
      {
        type: 'text',
        text: 'PYD: 5 of 12 rows',
        fontSize: 16,
        anchor: {
          col: PYD_START,
          colEnd: PYD_END,
          alignY: 'bottom',
          dy: 40,
        },
      },
      {
        type: 'text',
        text: 'NACHT: 12 of 12 rows',
        fontSize: 16,
        color: '#1565c0',
        maxWidth: 420,
        anchor: {
          col: NACHT_START,
          colEnd: NACHT_END,
          alignY: 'bottom',
          dy: 40,
        },
      },
    ],
  },
  {
    name: 'protein-family-filter',
    // The legend on the right, and the filter dialog that drives it: one row
    // per InterPro accession, with the color the overlay draws it in and how
    // many matches carry it.
    viewportWidth: 1400,
    viewportHeight: 620,
    url: fileSnap({
      height: 370,
      treeAreaWidth: 150,
      colWidth: 0.7,
      colorSchemeName: 'clustalx_protein_dynamic',
      ...files,
    }),
    settle: 2000,
    actions: [
      { click: '[data-testid="file_menu"]' },
      { click: '::-p-text(Annotations)' },
      { click: '::-p-text(Filter annotations)' },
      { waitFor: '::-p-text(accession)' },
    ],
    clip: 'full',
  },
  {
    name: 'protein-family-pyd-only',
    // Everything but the pyrin domain filtered off, which is the filter dialog's
    // checkboxes written into the snapshot. The five rows that keep the domain
    // are the primates plus dog and hedgehog: the control the page checks, since
    // a PYD that tracked "mammal" or "not a rodent" would not skip cow, pig and
    // horse.
    viewportWidth: 1600,
    url: fileSnap({
      height: 370,
      treeAreaWidth: 150,
      colWidth: 0.7,
      colorSchemeName: 'clustalx_protein_dynamic',
      featureFilters: Object.fromEntries(NON_PYD.map(a => [a, false])),
      ...files,
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'Dog and Hedgehog carry it, and neither is a primate',
        fontSize: 16,
        maxWidth: 420,
        anchor: {
          col: PYD_END + 90,
          rowLabel: 'Pig',
          alignX: 'left',
        },
      },
      {
        type: 'arrow',
        fromAnchor: {
          col: PYD_END + 86,
          rowLabel: 'Pig',
          alignX: 'left',
        },
        anchor: {
          col: PYD_END,
          rowLabel: 'Dog',
          alignX: 'right',
        },
      },
      {
        type: 'arrow',
        fromAnchor: {
          col: PYD_END + 86,
          rowLabel: 'Pig',
          alignX: 'left',
        },
        anchor: {
          col: PYD_END,
          rowLabel: 'Hedgehog',
          alignX: 'right',
        },
      },
    ],
  },
  {
    name: 'protein-family-closeup',
    // Base resolution at the PYD block's left edge, where the overview only
    // asserts. Cow and Horse carry residues under the columns the human PYD
    // occupies; Hamster is mostly gap. Tall enough for all twelve rows plus the
    // minimap and conservation tracks above them.
    viewportWidth: 1600,
    viewportHeight: 900,
    url: fileSnap({
      height: 520,
      treeAreaWidth: 150,
      colWidth: 14,
      rowHeight: 20,
      // scrollX is a negative px offset: column 34 at the left edge puts the
      // PYD block (col 38) just inside the frame
      scrollX: -34 * 14,
      colorSchemeName: 'clustalx_protein_dynamic',
      ...files,
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'Cow has residues in these columns and no pyrin domain over them',
        fontSize: 15,
        maxWidth: 700,
        anchor: {
          col: PYD_START + 4,
          rowLabel: 'Hedgehog',
          alignX: 'left',
          alignY: 'bottom',
          dy: 44,
        },
      },
      {
        type: 'arrow',
        fromAnchor: {
          col: PYD_START + 4,
          rowLabel: 'Hedgehog',
          alignX: 'left',
          alignY: 'bottom',
          dy: 30,
        },
        anchor: {
          col: PYD_START + 4,
          rowLabel: 'Cow',
          alignX: 'left',
          alignY: 'bottom',
        },
      },
    ],
  },
  {
    name: 'protein-family-link',
    // What the ?data= link at the end of the page opens: the three hosted files
    // plus a labeled highlight over the PYD columns, carried in the snapshot
    // rather than clicked in. Highlight coordinates are 1-based inclusive.
    viewportWidth: 1600,
    url: fileSnap({
      height: 370,
      treeAreaWidth: 150,
      colWidth: 0.7,
      colorSchemeName: 'clustalx_protein_dynamic',
      highlights: [
        { start: PYD_START + 1, end: PYD_END + 1, label: 'PYD (Pfam PF02758)' },
      ],
      ...files,
    }),
    settle: 2000,
    clip: 'viewer',
  },
]
