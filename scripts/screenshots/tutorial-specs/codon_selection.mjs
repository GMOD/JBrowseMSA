// Figures for docs/tutorials/codon_selection.md. Every spec deep-links the
// hosted TRIM5 codon alignment (packages/app/public/data/trim5/), so
// `--filter=codon` renders this whole set. See
// docs/tutorials/scripts/build_codon_selection.sh for how the alignment, the
// exon GFF and the dN/dS values were built.
import fs from 'node:fs'
import path from 'node:path'

import { repoRoot } from '../lib.mjs'
import { fileSnap } from '../snap.mjs'

const MSA_URI = 'data/trim5/trim5-cds.stock'
const GFF_URI = 'data/trim5/trim5-exons.gff'

const dndsValues = JSON.parse(
  fs.readFileSync(
    path.join(
      repoRoot,
      'packages',
      'app',
      'public',
      'data',
      'trim5',
      'trim5-dnds-values.json',
    ),
    'utf8',
  ),
)

const dndsTrack = {
  id: 'dnds',
  name: 'dN/dS (FEL)',
  kind: 'bar',
  values: dndsValues,
  max: 5,
  color: '#c0392b',
}

// Human-row nucleotide ranges (1-based, CDS coordinates), aa * 3 from the
// InterPro-called domain boundaries on Q9C035 (RING 15-59, B-box 90-132,
// B30.2/SPRY 281-493) and the literature-described V1 variable loop
// (326-341, Sawyer et al. 2005; Stremlau et al. 2005; Yap et al. 2005) that
// carries R332.
const highlights = [
  {
    row: 'human',
    start: 43,
    end: 396,
    label: 'RING + B-box (purifying control)',
    color: 'rgba(21,101,192,0.25)',
  },
  {
    row: 'human',
    start: 976,
    end: 1023,
    label: 'SPRY V1 patch',
    color: 'rgba(255,140,0,0.3)',
  },
  { row: 'human', start: 994, end: 996, label: 'R332', color: '#e3242b' },
]

// Alignment-column equivalents of the ranges above (0-based, for the
// screenshot callouts only, since annotations.mjs anchors on columns, not
// pixels.
const COL = {
  ring: { col: 42, colEnd: 179 },
  bbox: { col: 273, colEnd: 401 },
  v1: { col: 984, colEnd: 1091 },
  r332: { col: 1002, colEnd: 1004 },
}

const base = {
  treeAreaWidth: 170,
  rowHeight: 11,
  colorSchemeName: 'nucleotide',
  // the tree is embedded in the Stockholm file (#=GF NH), same as F12, so no
  // separate treeFilehandle is needed
  msaFilehandle: { uri: MSA_URI },
}

export const specs = [
  {
    name: 'codon-alignment-tree',
    // whole 600-codon alignment at a small colWidth so the full tree and the
    // full alignment are both on screen, matching the nlrp1 overview shots
    url: fileSnap({ ...base, colWidth: 0.7, height: 420 }),
    viewportWidth: 1600,
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'codon-exon-structure',
    // same view with the 7-exon overlay turned on: each exon is one color
    // down every row, the same mechanism as an InterProScan domain GFF
    url: fileSnap({
      ...base,
      colWidth: 0.7,
      height: 420,
      gffFilehandle: { uri: GFF_URI },
    }),
    viewportWidth: 1600,
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'codon-dnds-track',
    // the per-codon dN/dS bar above the alignment: tall spikes in the SPRY
    // region, mostly flat over RING/B-box
    url: fileSnap({
      ...base,
      colWidth: 0.7,
      height: 480,
      gffFilehandle: { uri: GFF_URI },
      columnTracks: [dndsTrack],
    }),
    viewportWidth: 1600,
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'codon-spry-patch',
    // zoomed to the V1 patch (human columns 984-1091) with R332 and the
    // patch boundary called out; scrollX brings column 930 to the left edge
    url: fileSnap({
      ...base,
      colWidth: 6,
      height: 480,
      gffFilehandle: { uri: GFF_URI },
      columnTracks: [dndsTrack],
      highlights,
      scrollX: -930 * 6,
    }),
    viewportWidth: 1600,
    settle: 2000,
    clip: 'viewer',
    annotations: [
      { type: 'box', anchor: COL.v1, color: '#e67e22', pad: 4 },
      { type: 'box', anchor: COL.r332, color: '#e3242b', pad: 3 },
      {
        type: 'text',
        text: 'SPRY V1 patch\n(human aa 326-341)',
        anchor: { ...COL.v1, alignY: 'top', rowLabel: 'human' },
        dy: -70,
        color: '#e67e22',
        fontSize: 16,
      },
      {
        type: 'text',
        text: 'R332',
        anchor: { ...COL.r332, alignY: 'bottom', rowLabel: 'human' },
        dy: 40,
        color: '#e3242b',
        fontSize: 16,
      },
    ],
  },
  {
    name: 'codon-purifying-control',
    // the RING and B-box zinc fingers: same dN/dS track, same scale, showing
    // the near-flat control region the SPRY patch is being compared against
    url: fileSnap({
      ...base,
      colWidth: 3,
      height: 480,
      gffFilehandle: { uri: GFF_URI },
      columnTracks: [dndsTrack],
      highlights,
      scrollX: -30 * 3,
    }),
    viewportWidth: 1400,
    settle: 2000,
    clip: 'viewer',
    annotations: [
      { type: 'box', anchor: COL.ring, color: '#1565c0', pad: 4 },
      { type: 'box', anchor: COL.bbox, color: '#1565c0', pad: 4 },
      {
        type: 'text',
        text: 'RING',
        anchor: { ...COL.ring, alignY: 'top', rowLabel: 'human' },
        dy: -70,
        color: '#1565c0',
        fontSize: 16,
      },
      {
        type: 'text',
        text: 'B-box',
        anchor: { ...COL.bbox, alignY: 'top', rowLabel: 'human' },
        dy: -70,
        color: '#1565c0',
        fontSize: 16,
      },
    ],
  },
  {
    name: 'codon-final-view',
    // the whole gene again, everything turned on together: exon structure,
    // dN/dS track and the three labeled highlights -- this is the snapshot
    // the shareable link at the end of the page opens
    url: fileSnap({
      ...base,
      colWidth: 0.7,
      height: 480,
      gffFilehandle: { uri: GFF_URI },
      columnTracks: [dndsTrack],
      highlights,
    }),
    viewportWidth: 1600,
    settle: 2000,
    clip: 'viewer',
  },
]
