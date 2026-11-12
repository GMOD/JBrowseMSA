// Figures for docs/tutorials/phylogeny_at_scale.md: an RSV-A phylogeny from
// Nextstrain, 1840 tips, reconstructed to one alignment in reference
// coordinates, then its 184-tip subsample colored from a row table.
// docs/tutorials/scripts/build_phylogeny_at_scale.py writes every hosted file
// and prints every row index below.
//
// Two hosted datasets. The full one (every tip) is sliced to the G gene so the
// file stays a few MB instead of the ~28 MB the whole genome would be at this
// row count; the subsampled one (every 10th tip, pruned to match) carries the
// whole genome, since the later figures scroll across it. The figure names
// predate the merge of the metadata page into this one: --filter=scale,
// phylogeny_metadata selects them all.
import { fileSnap } from '../snap.mjs'

const FULL = {
  msaFilehandle: { uri: 'data/scale/rsv-full.aln' },
  treeFilehandle: { uri: 'data/scale/rsv-full.nh' },
}
const SAMPLE = {
  msaFilehandle: { uri: 'data/scale/rsv-sample.aln' },
  treeFilehandle: { uri: 'data/scale/rsv-sample.nh' },
}

// The build script slides a 100nt window across G and across L, counting
// variable columns in each, and prints where the extremes fall: every column
// differs somewhere in the subsample from 5442-5541 (G's second variable
// region, near its C terminus), and only 15 of 100 do from 10132-10231, well
// inside L. 0-based columns below (one less than the script's 1-based ones)
// are what scrollX arithmetic uses, the same as MSACanvasBlock.
const G_HOTSPOT0 = 5441
const L_COLDSPOT0 = 10131
const COL_WIDTH_BASE = 14

const TABLED = {
  ...SAMPLE,
  treeMetadataFilehandle: { uri: 'data/scale/rsv-sample-rowdata.json' },
}

// the subsample's collection years run from 1977 to 2024
const YEAR = {
  field: 'year',
  scale: {
    type: 'linear',
    scheme: 'viridis',
    domainMin: 1977,
    domainMax: 2024,
  },
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
  residueColor: { scale: { scheme: 'nucleotide' } },
}

// All 184 rows at once, with the tree area widened so the edges carrying a
// branch color are visible.
const WHOLE = {
  height: 1472,
  treeAreaWidth: 700,
  colWidth: 0.3,
  rowHeight: 8,
  drawLabels: false,
  residueColor: { scale: { scheme: 'nucleotide' } },
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
    name: 'scale-whole-tree',
    // Every one of the 1840 tips, one pixel of row height, the G-gene slice
    // as the alignment. No labels draw below minLetterRowHeight (8).
    viewportWidth: 1000,
    viewportHeight: 2000,
    url: fileSnap({
      height: 1900,
      treeAreaWidth: 130,
      colWidth: 0.3,
      rowHeight: 1,
      residueColor: { scale: { scheme: 'nucleotide' } },
      ...FULL,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'scale-collapsed',
    // The same 1840-tip dataset, scrolled to the 90-row window that holds
    // node-0-0-1 (rows 1791-1839 in the tree's own sort order, which
    // ladderizes by clade size and so sorts this small clade to the bottom) at
    // a row height that draws labels. All 49 of its tips carry the label A.1
    // and were sampled in the USA, so the collapsed row is a single-country,
    // single-clade group.
    viewportWidth: 1100,
    viewportHeight: 400,
    url: fileSnap({
      height: 350,
      treeAreaWidth: 360,
      colWidth: 0.3,
      rowHeight: 10,
      scrollY: -1780 * 10,
      residueColor: { scale: { scheme: 'nucleotide' } },
      collapsed: ['node-0-0-1'],
      ...FULL,
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: '49 tips, all sampled in the USA, one row',
        fontSize: 15,
        maxWidth: 320,
        anchor: { col: 5, rowLabel: 'node-0-0-1', alignX: 'left' },
      },
    ],
  },
  {
    name: 'scale-subsample',
    // The subsampled dataset, every 10th tip in the file's own order: 184
    // rows instead of 1840, and at this row height the strain names beside
    // the tree read.
    viewportWidth: 1450,
    viewportHeight: 750,
    url: fileSnap({
      height: 700,
      treeAreaWidth: 420,
      colWidth: 0.3,
      rowHeight: 16,
      residueColor: { scale: { scheme: 'nucleotide' } },
      ...SAMPLE,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'scale-zoom-variable',
    // Base resolution over columns 5442-5541, the 100nt window in G where
    // every column differs somewhere in the subsample.
    viewportWidth: 1600,
    viewportHeight: 700,
    url: fileSnap({
      height: 650,
      treeAreaWidth: 170,
      colWidth: COL_WIDTH_BASE,
      rowHeight: 16,
      scrollX: -(G_HOTSPOT0 - 10) * COL_WIDTH_BASE,
      residueColor: { scale: { scheme: 'nucleotide' } },
      ...SAMPLE,
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'scale-zoom-conserved',
    // The same viewer, scrolled about 4700 columns left, back into L: columns
    // 10132-10231, where only 15 of 100 differ.
    viewportWidth: 1600,
    viewportHeight: 700,
    url: fileSnap({
      height: 650,
      treeAreaWidth: 170,
      colWidth: COL_WIDTH_BASE,
      rowHeight: 16,
      scrollX: -(L_COLDSPOT0 - 10) * COL_WIDTH_BASE,
      residueColor: { scale: { scheme: 'nucleotide' } },
      ...SAMPLE,
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'phylogeny_metadata-row-table',
    // the table loaded and no channel reading it: every tip label draws in the
    // theme's text color, and the callout names the four fields the table
    // gives the row it points at
    viewportWidth: 1300,
    viewportHeight: 760,
    url: fileSnap({ ...READABLE, ...TABLED }),
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
      ...TABLED,
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
      ...TABLED,
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
      ...TABLED,
    }),
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'phylogeny_metadata-row-tint',
    // rowTint by clade over all 184 rows. The alignment is the whole genome at
    // a small colWidth, wider than the viewport, so the minimap draws on top
    viewportWidth: 1450,
    viewportHeight: 1550,
    url: fileSnap({
      ...WHOLE,
      treeAreaWidth: 130,
      encodings: [byClade('rowTint')],
      ...TABLED,
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
      ...TABLED,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'phylogeny_metadata-year-strip',
    // the year field through one viridis ramp pinned at 1977 and 2024, read
    // by the tip labels and a strip, which share one gradient legend
    viewportWidth: 1300,
    viewportHeight: 760,
    url: fileSnap({
      ...READABLE,
      encodings: [{ channel: 'tipLabel', ...YEAR }],
      rowPanels: [{ kind: 'strip', encoding: { fill: YEAR }, width: 14 }],
      ...TABLED,
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
      ...TABLED,
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
