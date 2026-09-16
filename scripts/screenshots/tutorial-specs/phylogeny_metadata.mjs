// Figures for docs/tutorials/phylogeny_metadata.md: the RSV-A subsample of
// docs/tutorials/phylogeny_at_scale.md with its row table loaded, drawn by the
// tipLabel, branch and rowTint channels and marked with a clade highlight.
//
// The table is data/scale/rsv-sample-rowdata.json, written by
// docs/tutorials/scripts/build_phylogeny_metadata.py from the clade, country,
// region and year in each tip's Nextstrain node_attrs. Every row index below
// is one that script printed: it prunes the tree the same way the hosted
// Newick was pruned and then sorts each node's children by branch length,
// shortest first, which is the order the viewer lays the rows out in.

import { fileSnap } from '../snap.mjs'

const SAMPLE = {
  msaFilehandle: { uri: 'data/scale/rsv-sample.aln' },
  treeFilehandle: { uri: 'data/scale/rsv-sample.nh' },
  treeMetadataFilehandle: { uri: 'data/scale/rsv-sample-rowdata.json' },
}

// The readable window: 38 rows at 18px, starting on row 66. A.D holds rows
// 72-79, A.D.3 rows 80-92 and A.D rows 93-108, so two clades meet twice inside
// the frame.
const ROW_H = 18
const WINDOW_TOP = 66
const READABLE = {
  height: 700,
  treeAreaWidth: 560,
  colWidth: 0.3,
  rowHeight: ROW_H,
  drawLabels: true,
  scrollY: -WINDOW_TOP * ROW_H,
  colorSchemeName: 'nucleotide',
}

// All 184 rows at once, the geometry docs/media/scale-clade-groups.png uses,
// with the tree area widened so the edges carrying a branch color are visible.
const WHOLE = {
  height: 1472,
  treeAreaWidth: 700,
  colWidth: 0.3,
  rowHeight: 8,
  drawLabels: false,
  colorSchemeName: 'nucleotide',
}

// 23 clades and 28 countries both run past the end of every named palette, so
// each field's values take evenly spaced hues. Leaving `scale` out asks for
// that default.
const byClade = channel => ({ channel, field: 'clade' })

// The largest clade whose tips are exactly the tips under one node. The two
// names sit under different children of that node, so their common ancestor is
// the node itself, and 13 is the leaf count the script measured under it.
const AD3 = {
  mrca: ['330103036|A.D.3|France|2019', 'MZ151852|A.D.3|Russia|2020'],
  tips: 13,
  mark: 'highlight',
  color: '#ffd54f',
}

// One tip to read against the JSON it came from, on display row 88, inside
// A.D.3.
const CHECK_TIP = 'RSVA/20200035/BJ/CHN/2020.01.09|A.D.3|China|2020'

export const specs = [
  {
    name: 'phylogeny_metadata-row-table',
    // the table loaded and no channel reading it: every tip label draws in the
    // theme's text color, and the callout names the four fields the table
    // gives the row it points at
    viewportWidth: 1300,
    viewportHeight: 760,
    url: fileSnap({ ...READABLE, ...SAMPLE }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'clade A.D.3, country China, region Asia, year 2020',
        fontSize: 15,
        maxWidth: 300,
        anchor: { col: 8, rowLabel: CHECK_TIP, alignX: 'left' },
      },
    ],
  },
  {
    name: 'phylogeny_metadata-tip-labels',
    // tipLabel by clade over the same window, so the label color changes where
    // A.D gives way to A.D.3 on row 80 and back on row 93
    viewportWidth: 1300,
    viewportHeight: 760,
    url: fileSnap({
      ...READABLE,
      encodings: [byClade('tipLabel')],
      ...SAMPLE,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'phylogeny_metadata-branch-clade',
    // branch by clade over all 184 rows: 293 of the 363 edges take a color,
    // 109 of them above an internal node
    viewportWidth: 1450,
    viewportHeight: 1550,
    url: fileSnap({
      ...WHOLE,
      encodings: [byClade('branch')],
      ...SAMPLE,
    }),
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'phylogeny_metadata-branch-country',
    // the same view over the country field: 207 edges take a color and only 23
    // of them are above an internal node
    viewportWidth: 1450,
    viewportHeight: 1550,
    url: fileSnap({
      ...WHOLE,
      encodings: [{ channel: 'branch', field: 'country' }],
      ...SAMPLE,
    }),
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'phylogeny_metadata-row-tint',
    // rowTint by clade at the geometry of docs/media/scale-clade-groups.png,
    // whose bands the phylogeny-at-scale page listed row by row
    viewportWidth: 1450,
    viewportHeight: 1550,
    url: fileSnap({
      ...WHOLE,
      treeAreaWidth: 130,
      encodings: [byClade('rowTint')],
      ...SAMPLE,
    }),
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'phylogeny_metadata-clade-highlight',
    // the A.D.3 rectangle over the readable window, with the tip labels
    // colored so the rows it covers can be read against their clade
    viewportWidth: 1300,
    viewportHeight: 760,
    url: fileSnap({
      ...READABLE,
      encodings: [byClade('tipLabel')],
      clades: [AD3],
      ...SAMPLE,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'phylogeny_metadata-shared-link',
    // the link the page ends on: labels by clade, the row tint moved to the
    // region field so it carries a second legend, the A.D.3 rectangle, and a
    // box around the one row the page checks against the Nextstrain JSON
    viewportWidth: 1300,
    viewportHeight: 760,
    url: fileSnap({
      ...READABLE,
      encodings: [byClade('tipLabel'), { channel: 'rowTint', field: 'region' }],
      clades: [AD3],
      ...SAMPLE,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: 0, colEnd: 900, rowLabel: CHECK_TIP },
        strokeWidth: 3,
      },
    ],
  },
]
