// Figures for docs/tutorials/p53_variant_effects.md.
//
// The tracks and the domain bands come out of the same p53-layers.json that
// docs/tutorials/scripts/build_p53_variant_effects.sh writes and the app hosts,
// so re-running the script updates the figures with the data. Close-ups scroll
// to a residue of the Human row resolved through the hosted alignment's own
// gaps, as the callouts anchor on columns: the aligner decides which column a
// residue lands in, and a re-run can change it.
import fs from 'node:fs'
import path from 'node:path'

import { repoRoot } from '../lib.mjs'
import { fileSnap } from '../snap.mjs'

const dataDir = path.join(repoRoot, 'packages', 'app', 'public', 'data', 'p53')
const layers = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'p53-layers.json'), 'utf8'),
)
const alignment = fs.readFileSync(
  path.join(dataDir, 'p53-vertebrates.afa'),
  'utf8',
)

const track = id => layers.columnTracks.find(t => t.id === id)
// the tint the script gives the two bands it ships, for the bands a figure adds
const bandColor = layers.highlights[0].color

const band = (start, end, label) => ({
  row: 'Human',
  start,
  end,
  label,
  color: bandColor,
})

// residue of the Human row -> 0-based alignment column
const humanColumn = (() => {
  const rows = {}
  let name = ''
  for (const line of alignment.split('\n')) {
    if (line.startsWith('>')) {
      name = line.slice(1).trim()
      rows[name] = ''
    } else if (line.trim()) {
      rows[name] += line.trim()
    }
  }
  const columns = []
  let residue = 0
  for (const [col, letter] of [...rows.Human].entries()) {
    if (letter !== '-') {
      columns[++residue] = col
    }
  }
  return columns
})()

// The six hotspot residues, each its own band. 248 and 249 are one column
// apart, and a label sits to the right of the band it names, so 248's would be
// drawn under 249's band: the pair is labeled once, on the right-hand one.
const HOTSPOTS = [
  { residue: 175, label: '175' },
  { residue: 245, label: '245' },
  { residue: 248 },
  { residue: 249, label: '248/249' },
  { residue: 273, label: '273' },
  { residue: 282, label: '282' },
]

const base = {
  height: 560,
  treeAreaWidth: 140,
  colWidth: 2.6,
  rowHeight: 15,
  relativeTo: 'Human',
  colorSchemeName: 'clustalx_protein_dynamic',
  // the second conservation histogram repeats the first in a different
  // palette and takes height from the three tracks below it
  turnedOffTracks: { 'property-conservation': true },
  msaFilehandle: { uri: 'data/p53/p53-vertebrates.afa' },
  treeFilehandle: { uri: 'data/p53/p53-vertebrates.nh' },
}

// A close-up: base resolution, scrolled so `fromResidue` of the Human row sits
// at the left edge.
function closeup({ fromResidue, colWidth, ...rest }) {
  return {
    ...base,
    colWidth,
    rowHeight: 16,
    scrollX: -humanColumn[fromResidue] * colWidth,
    ...rest,
  }
}

export const specs = [
  {
    name: 'p53-variant-alignment',
    // The whole protein at a glance, and the only figure drawn in plain
    // residue colors. Every later figure diffs the rows against Human, so a
    // conserved column draws as dots.
    url: fileSnap({ ...base, height: 400, relativeTo: undefined }),
    viewportWidth: 1400,
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'p53-variant-clinvar',
    url: fileSnap({
      ...base,
      height: 440,
      highlights: layers.highlights,
      columnTracks: [track('clinvar')],
    }),
    viewportWidth: 1400,
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'p53-variant-alphamissense',
    url: fileSnap({
      ...base,
      height: 440,
      highlights: layers.highlights,
      columnTracks: [track('alphamissense')],
    }),
    viewportWidth: 1400,
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'p53-variant-mavedb',
    url: fileSnap({
      ...base,
      height: 440,
      highlights: layers.highlights,
      columnTracks: [track('mavedb')],
    }),
    viewportWidth: 1400,
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'p53-variant-three-tracks',
    // all three over one set of columns
    url: fileSnap({
      ...base,
      highlights: layers.highlights,
      columnTracks: layers.columnTracks,
    }),
    viewportWidth: 1400,
    viewportHeight: 800,
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'p53-variant-hotspots',
    // base resolution across the hotspot half of the DNA-binding domain: the
    // six columns carry a residue every vertebrate here kept, so the reference
    // diff draws them as dots all the way down
    url: fileSnap(
      closeup({
        fromResidue: 170,
        colWidth: 13,
        height: 620,
        highlights: HOTSPOTS.map(({ residue, label }) => ({
          row: 'Human',
          start: residue,
          end: residue,
          ...(label ? { label } : {}),
        })),
        columnTracks: layers.columnTracks,
      }),
    ),
    viewportWidth: 1800,
    viewportHeight: 900,
    settle: 3000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'six hotspot columns: every row carries the human residue',
        fontSize: 15,
        maxWidth: 600,
        anchor: {
          col: humanColumn[175],
          colEnd: humanColumn[282],
          alignY: 'bottom',
          dy: 30,
        },
      },
    ],
  },
  {
    name: 'p53-variant-control',
    // the same three tracks over the disordered N terminus, at the same zoom
    // as the hotspot figure
    url: fileSnap(
      closeup({
        fromResidue: 18,
        colWidth: 13,
        height: 620,
        highlights: [
          band(1, 44, 'Transactivation'),
          band(50, 96, 'Proline-rich'),
        ],
        columnTracks: layers.columnTracks,
      }),
    ),
    viewportWidth: 1800,
    viewportHeight: 900,
    settle: 3000,
    clip: 'viewer',
    annotations: [
      {
        type: 'arrow',
        fromAnchor: {
          col: humanColumn[102],
          alignX: 'left',
          alignY: 'bottom',
          dx: -150,
          dy: 40,
        },
        anchor: { col: humanColumn[102], alignX: 'left', alignY: 'bottom' },
      },
      {
        type: 'text',
        text: 'DNA-binding domain starts here',
        fontSize: 15,
        textAlign: 'end',
        anchor: {
          col: humanColumn[102],
          alignX: 'left',
          alignY: 'bottom',
          dx: -150,
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'p53-variant-oligomerization',
    // the tetramerization helix, where the two predictions carry on and the
    // cell-based screen does not
    url: fileSnap(
      closeup({
        fromResidue: 316,
        colWidth: 13,
        height: 620,
        highlights: [band(325, 356, 'Oligomerization')],
        columnTracks: layers.columnTracks,
      }),
    ),
    viewportWidth: 1800,
    viewportHeight: 900,
    settle: 3000,
    clip: 'viewer',
  },
]
