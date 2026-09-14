// Figures for docs/tutorials/phylogeny_at_scale.md: an RSV-A whole-genome
// phylogeny from Nextstrain, 1840 tips, reconstructed to one alignment in
// reference coordinates by docs/tutorials/scripts/build_phylogeny_at_scale.sh.
//
// Two hosted datasets. The full one (every tip) is sliced to the G gene so the
// file stays a few MB instead of the ~28 MB the whole genome would be at this
// row count; the subsampled one (every 10th tip, pruned to match) carries the
// whole genome, since the later figures scroll across it. Clade highlights are
// read straight from the subsampled file's own headers, so a regenerated
// dataset can't drift from what the spec draws.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileSnap } from '../snap.mjs'

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/app/public/data/scale',
)

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

// The clade labels a tip carries are baked into its own row name (see
// label_for in the build script): 'accession|clade|country|year'. Reading
// them back out of the hosted file, rather than hardcoding the list here,
// means a regenerated dataset can't quietly drift from what this draws.
function topClades(n) {
  const text = fs.readFileSync(path.join(dataDir, 'rsv-sample.aln'), 'utf8')
  const byClade = new Map()
  for (const line of text.split('\n')) {
    if (line.startsWith('>')) {
      const row = line.slice(1).trim()
      const clade = row.split('|')[1]
      if (!byClade.has(clade)) {
        byClade.set(clade, [])
      }
      byClade.get(clade).push(row)
    }
  }
  return [...byClade.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, n)
}

const CLADE_COLORS = [
  'rgba(21,101,192,0.4)',
  'rgba(46,125,50,0.4)',
  'rgba(198,40,40,0.4)',
  'rgba(106,27,154,0.4)',
  'rgba(239,108,0,0.4)',
  'rgba(0,131,143,0.4)',
]

const cladeHighlights = topClades(6).map(([clade, rows], i) => ({
  rows,
  color: CLADE_COLORS[i],
  label: `${clade} (${rows.length})`,
}))

export const specs = [
  {
    name: 'scale-whole-tree',
    // Every one of the 1840 tips, one pixel of row height, the G-gene slice
    // as the alignment. No labels draw below minLetterRowHeight (8), so this
    // is what the dataset looks like before anything below narrows it down.
    viewportWidth: 1000,
    viewportHeight: 2000,
    url: fileSnap({
      height: 1900,
      treeAreaWidth: 130,
      colWidth: 0.3,
      rowHeight: 1,
      colorSchemeName: 'nucleotide',
      ...FULL,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'scale-collapsed',
    // The same 1840-tip dataset, scrolled to the 90-row window that holds
    // node-0-0-1 (rows 1791-1839 in the tree's own sort order -- ladderized by
    // clade size, so this small clade sorts to the bottom, not row 0) at a row
    // height that draws labels. Every one of its 49 tips calls itself A.1, and
    // every one was sampled in the USA, so collapsing it is a real
    // epidemiological unit disappearing into one row, not an arbitrary cut.
    viewportWidth: 1100,
    viewportHeight: 400,
    url: fileSnap({
      height: 350,
      treeAreaWidth: 360,
      colWidth: 0.3,
      rowHeight: 10,
      scrollY: -1780 * 10,
      colorSchemeName: 'nucleotide',
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
      colorSchemeName: 'nucleotide',
      ...SAMPLE,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'scale-clade-groups',
    // All 184 rows at once, tinted in tree order by the clade each tip
    // carries in its own name -- the six largest clades in the subsample,
    // colored and labeled through `highlights`, no row reordering. The
    // alignment itself is the full 15225nt genome at a small colWidth, wider
    // than the viewport, so the minimap bar draws across the top on its own.
    viewportWidth: 1450,
    viewportHeight: 1550,
    url: fileSnap({
      height: 1472,
      treeAreaWidth: 130,
      colWidth: 0.3,
      rowHeight: 8,
      drawLabels: false,
      colorSchemeName: 'nucleotide',
      highlights: cladeHighlights,
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
      colorSchemeName: 'nucleotide',
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
      colorSchemeName: 'nucleotide',
      ...SAMPLE,
    }),
    settle: 2000,
    clip: 'viewer',
  },
]
