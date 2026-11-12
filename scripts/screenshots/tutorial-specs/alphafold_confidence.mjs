/**
 * Figures for docs/tutorials/alphafold_confidence.md: fourteen vertebrate
 * TDP-43 orthologs with the mean pLDDT of their AlphaFold models per column as
 * a bar track, three rows' own pLDDT as strip tracks, each row's count of
 * residues under 50 as a bar panel, and the Pfam domains of the human row as
 * highlights.
 *
 * Every column and every residue number comes from the files the build script
 * wrote (packages/app/public/data/tdp43), so a re-run that moves a column moves
 * the callouts with it.
 */
import fs from 'node:fs'
import path from 'node:path'

import { repoRoot } from '../lib.mjs'
import { alignedRows, fileSnap, residueColumns } from '../snap.mjs'

const dataDir = path.join(
  repoRoot,
  'packages',
  'app',
  'public',
  'data',
  'tdp43',
)
const read = name => fs.readFileSync(path.join(dataDir, name), 'utf8')

const layers = JSON.parse(read('tardbp-layers.json'))
const REF = 'Human'

const aligned = alignedRows(read('tardbp.afa'))

// residue of the reference row (1-based) -> 0-based alignment column
const columnOfResidue = residueColumns(aligned[REF])
const col = residue => columnOfResidue[residue - 1]

const [meanTrack, ...rowStrips] = layers.columnTracks
const domain = short =>
  layers.highlights.find(h => h.label.startsWith(`${short} `))
const rrm1 = domain('RRM1')
const ctd = domain('TDP43_C')

// the run inside the C-terminal domain where the mean rises out of the very
// low band, the same run the build script prints
const bumpColumns = (() => {
  const runs = []
  let run
  for (let i = col(ctd.start); i <= col(ctd.end); i++) {
    if (meanTrack.values[i] < 50) {
      run = undefined
    } else if (run) {
      run.end = i
    } else {
      run = { start: i, end: i }
      runs.push(run)
    }
  }
  return runs.reduce((best, r) =>
    r.end - r.start > best.end - best.start ? r : best,
  )
})()
const bumpResidues = {
  start: columnOfResidue.filter(c => c <= bumpColumns.start).length,
  end: columnOfResidue.filter(c => c <= bumpColumns.end).length,
}

// the column inside RRM1 the page reads row by row, 21 residues into the domain
const probeColumn = col(rrm1.start + 21)
// and the one inside the C-terminal region, 44 columns into the domain
const ctdProbeColumn = col(ctd.start) + 44
const ctdProbeResidue = columnOfResidue.indexOf(ctdProbeColumn) + 1

const files = {
  msaFilehandle: { uri: 'data/tdp43/tardbp.afa' },
  treeFilehandle: { uri: 'data/tdp43/tardbp.nwk' },
}
const rowTable = {
  treeMetadataFilehandle: { uri: 'data/tdp43/tardbp-rowdata.json' },
  rowPanels: layers.rowPanels,
}
const mean = { columnTracks: [meanTrack] }
const strips = { columnTracks: [meanTrack, ...rowStrips] }

// 431 columns at 3.2px fill a 1600px viewport beside a 190px tree, and a
// 1720px one beside the tree and the bar panel
const wide = {
  height: 520,
  treeAreaWidth: 190,
  colWidth: 3.2,
  rowHeight: 22,
  colorSchemeName: 'clustalx_protein_dynamic',
  // the second conservation histogram repeats the first in another palette
  turnedOffTracks: { 'property-conservation': true },
  ...files,
}
// a close-up starts a few residues left of what it shows, so the frame carries
// some context
const closeUp = (fromResidue, colWidth) => ({
  height: 620,
  treeAreaWidth: 190,
  colWidth,
  rowHeight: 22,
  scrollX: -col(fromResidue) * colWidth,
  relativeTo: REF,
  colorSchemeName: 'clustalx_protein_dynamic',
  turnedOffTracks: { 'property-conservation': true },
  ...files,
})

export const specs = [
  {
    name: 'alphafold_confidence-1',
    // the alignment as the aligner wrote it, before any layer
    viewportWidth: 1600,
    url: fileSnap(wide),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `${REF} residues ${ctd.start}-${ctd.end}, the C-terminal region`,
        fontSize: 16,
        maxWidth: 480,
        anchor: {
          col: col(ctd.start),
          alignX: 'left',
          alignY: 'bottom',
          dy: 34,
        },
      },
      {
        type: 'arrow',
        fromAnchor: {
          col: 0,
          alignX: 'left',
          alignY: 'bottom',
          dx: 40,
          dy: 18,
        },
        anchor: { col: 0, rowLabel: REF, alignX: 'left', dx: -96 },
      },
      {
        type: 'text',
        text: `${REF}, outside the other mammals`,
        fontSize: 16,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 34 },
      },
    ],
  },
  {
    name: 'alphafold_confidence-2',
    // the mean pLDDT per column, colored by its band, over the alignment
    viewportWidth: 1600,
    url: fileSnap({ ...wide, ...mean }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'alphafold_confidence-3',
    // the Pfam domains of the reference row against the same track
    viewportWidth: 1600,
    url: fileSnap({
      ...wide,
      ...mean,
      highlights: layers.highlights,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'alphafold_confidence-4',
    // three rows' own pLDDT as strips under the mean
    viewportWidth: 1600,
    url: fileSnap({ ...wide, height: 540, ...strips }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'alphafold_confidence-5',
    // each row's count of residues under 50 as a bar beside the tree, in a
    // viewport wider by the panel's 130px
    viewportWidth: 1720,
    url: fileSnap({ ...wide, height: 540, ...strips, ...rowTable }),
    settle: 3000,
    clip: 'viewer',
  },
  {
    name: 'alphafold_confidence-6',
    // the RRM1 column the page reads row by row, every row against the
    // reference: a dot is the same residue
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp(rrm1.start + 8, 20),
      ...strips,
      highlights: [
        {
          row: REF,
          start: rrm1.start + 21,
          end: rrm1.start + 21,
          label: `${REF} ${rrm1.start + 21}`,
        },
      ],
    }),
    settle: 3000,
    clip: 'viewer',
    annotations: [
      { type: 'box', anchor: { col: probeColumn }, pad: 3 },
      {
        type: 'text',
        text: 'inside RRM1: one letter, and a confident bar and strips',
        fontSize: 16,
        maxWidth: 520,
        anchor: {
          col: probeColumn,
          alignX: 'left',
          alignY: 'bottom',
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'alphafold_confidence-ctd-column',
    // the C-terminal column the page reads row by row, framed like the RRM1
    // one so the two compare
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp(ctdProbeResidue - 13, 20),
      ...strips,
      highlights: [
        {
          row: REF,
          start: ctdProbeResidue,
          end: ctdProbeResidue,
          label: `${REF} ${ctdProbeResidue}`,
        },
      ],
    }),
    settle: 3000,
    clip: 'viewer',
    annotations: [
      { type: 'box', anchor: { col: ctdProbeColumn }, pad: 3 },
      {
        type: 'text',
        text: 'inside TDP43_C: four letters, and a very low bar and strips',
        fontSize: 16,
        maxWidth: 560,
        anchor: {
          col: ctdProbeColumn,
          alignX: 'left',
          alignY: 'bottom',
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'alphafold_confidence-7',
    // the one stretch of the C-terminal region the mean rises over
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp(bumpResidues.start - 12, 20),
      ...strips,
      highlights: [
        {
          row: REF,
          start: bumpResidues.start,
          end: bumpResidues.end,
          label: `${REF} ${bumpResidues.start}-${bumpResidues.end}`,
        },
      ],
    }),
    settle: 3000,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: bumpColumns.start, colEnd: bumpColumns.end },
        pad: 3,
      },
      {
        type: 'text',
        text: 'Human and Zebrafish rise to low here, Ghostshark stays very low',
        fontSize: 16,
        maxWidth: 600,
        anchor: {
          col: bumpColumns.start,
          colEnd: bumpColumns.end,
          alignY: 'bottom',
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'alphafold_confidence-8',
    // the mean, the three row strips, the bar panel and the domain highlights
    // in one view
    viewportWidth: 1720,
    viewportHeight: 900,
    url: fileSnap({
      ...wide,
      height: 540,
      ...strips,
      ...rowTable,
      highlights: layers.highlights,
    }),
    settle: 3000,
    clip: 'viewer',
  },
]
