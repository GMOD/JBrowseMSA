// Figures for docs/tutorials/r_protease_triad.md: fourteen peptidase S1
// domains fetched, aligned and measured in R.
//
// Every figure loads the hosted copies of the files
// docs/tutorials/scripts/build_r_protease_triad.R writes
// (data/proteases/proteases.aln, .nh), and the layers come out of the
// proteases-layers.json the same run wrote, so a rerun of the script updates
// the figures with the numbers. Callouts anchor on alignment columns and row
// labels, never pixels.

import fs from 'node:fs'
import path from 'node:path'

import { repoRoot } from '../lib.mjs'
import { fileSnap } from '../snap.mjs'

const dataDir = path.join(
  repoRoot,
  'packages',
  'app',
  'public',
  'data',
  'proteases',
)
const layers = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'proteases-layers.json'), 'utf8'),
)
const alignment = fs.readFileSync(path.join(dataDir, 'proteases.aln'), 'utf8')

const REFERENCE = 'Chymotrypsinogen'

// residue of the reference row -> 0-based alignment column, the same walk the
// viewer does when a highlight names a row
const referenceColumn = (() => {
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
  for (const [column, letter] of [...rows[REFERENCE]].entries()) {
    if (letter !== '-') {
      columns[++residue] = column
    }
  }
  return columns
})()

const track = id => layers.columnTracks.find(t => t.id === id)
const band = label => layers.highlights.find(h => h.label === label)
const column = label => referenceColumn[band(label).start]

const base = {
  height: 520,
  treeAreaWidth: 200,
  colWidth: 3.4,
  rowHeight: 18,
  colorSchemeName: 'clustalx_protein_dynamic',
  msaFilehandle: { uri: 'data/proteases/proteases.aln' },
  treeFilehandle: { uri: 'data/proteases/proteases.nh' },
}

// The five rows UniProt annotates with no charge-relay system, in the order the
// tree puts them, for a callout that names them where they sit.
const PSEUDOENZYMES = ['Haptoglobin', 'Protein_Z', 'MST1', 'HGF', 'Azurocidin']

export const specs = [
  {
    name: 'r-protease-domains',
    // The fourteen domains after AlignSeqs, with no tree, so the rows stay in
    // the order the accession table lists them: nine active, then five dead.
    url: fileSnap({
      ...base,
      height: 440,
      treeFilehandle: undefined,
      treeAreaWidth: 150,
    }),
    viewportWidth: 1400,
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: '14 peptidase S1 domains, 297 columns',
        fontSize: 16,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 30 },
      },
    ],
  },
  {
    name: 'r-protease-tree',
    // The neighbor-joining tree beside the same alignment. Each row with no
    // charge-relay system sits next to an active protease, in four different
    // places.
    url: fileSnap({ ...base, height: 380 }),
    viewportWidth: 1400,
    settle: 2500,
    clip: 'viewer',
    annotations: [
      ...PSEUDOENZYMES.map(row => ({
        type: 'box',
        anchor: { col: 0, colEnd: 296, rowLabel: row },
        color: '#c0392b',
        pad: 1,
      })),
      {
        type: 'text',
        text: 'red: the five rows UniProt annotates with no charge-relay system',
        fontSize: 16,
        color: '#c0392b',
        maxWidth: 620,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 30 },
      },
    ],
  },
  {
    name: 'r-protease-layers',
    // Both layers R computed: the BLOSUM62 bar track, and chymotrypsinogen's
    // four intra-domain disulfide bonds as arcs over the columns its cysteines
    // land in.
    url: fileSnap({
      ...base,
      height: 470,
      columnTracks: layers.columnTracks,
      highlights: layers.highlights,
    }),
    viewportWidth: 1400,
    viewportHeight: 760,
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'r-protease-triad',
    // Base resolution at the catalytic serine, the last of the three bands.
    // Nine rows read S and five read something else.
    url: fileSnap({
      ...base,
      height: 560,
      colWidth: 13,
      rowHeight: 20,
      scrollX: -(column('Ser195') - 14) * 13,
      columnTracks: [track('blosum')],
      highlights: [band('Ser195')],
    }),
    viewportWidth: 1400,
    viewportHeight: 800,
    settle: 3000,
    clip: 'viewer',
    annotations: [
      ...PSEUDOENZYMES.map(row => ({
        type: 'box',
        anchor: { col: column('Ser195'), rowLabel: row },
        color: '#c0392b',
        pad: 2,
      })),
    ],
  },
]
