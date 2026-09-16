/**
 * Figures for docs/tutorials/alphafold_confidence.md: fourteen vertebrate
 * TDP-43 orthologs with the per-residue pLDDT of their AlphaFold models as a
 * column track, the very low runs of each model as a per-row overlay, and the
 * Pfam domains of the human row as highlights.
 *
 * Every column and every residue number comes from the files the build script
 * wrote (packages/app/public/data/tdp43), so a re-run that moves a column moves
 * the callouts with it.
 */
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
  'tdp43',
)
const read = name => fs.readFileSync(path.join(dataDir, name), 'utf8')

const layers = JSON.parse(read('tardbp-layers.json'))
const REF = 'Human'

const aligned = {}
let name
for (const line of read('tardbp.afa').split('\n')) {
  if (line.startsWith('>')) {
    name = line.slice(1).trim()
    aligned[name] = ''
  } else if (line.trim()) {
    aligned[name] += line.trim()
  }
}

// residue of the reference row (1-based) -> 0-based alignment column
const columnOfResidue = []
for (const [i, letter] of [...aligned[REF]].entries()) {
  if (letter !== '-') {
    columnOfResidue.push(i)
  }
}
const col = residue => columnOfResidue[residue - 1]

const [, bandTrack] = layers.columnTracks
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
    if (bandTrack.data[i] === 'D') {
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

const files = {
  msaFilehandle: { uri: 'data/tdp43/tardbp.afa' },
  treeFilehandle: { uri: 'data/tdp43/tardbp.nwk' },
}
const gff = { gffFilehandle: { uri: 'data/tdp43/tardbp-lowconf.gff' } }
const rowTable = {
  treeMetadataFilehandle: { uri: 'data/tdp43/tardbp-rowdata.json' },
  rowPanels: layers.rowPanels,
}
const tracks = { columnTracks: layers.columnTracks }

// 431 columns at 3.2px fill a 1600px viewport beside a 190px tree
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
    ],
  },
  {
    name: 'alphafold_confidence-2',
    // the mean pLDDT per column and its band, over the alignment
    viewportWidth: 1600,
    url: fileSnap({ ...wide, ...tracks }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'alphafold_confidence-3',
    // the Pfam domains of the reference row against the same two tracks
    viewportWidth: 1600,
    url: fileSnap({
      ...wide,
      ...tracks,
      highlights: layers.highlights,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'alphafold_confidence-4',
    // each row's own runs under pLDDT 50, from the GFF
    viewportWidth: 1600,
    url: fileSnap({
      ...wide,
      ...tracks,
      ...gff,
      showDomainLegend: false,
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'alphafold_confidence-5',
    // one strip per Pfam domain, each row's band over that domain's columns
    viewportWidth: 1600,
    url: fileSnap({ ...wide, ...tracks, ...rowTable }),
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
      ...tracks,
      ...gff,
      showDomainLegend: false,
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
        text: 'inside RRM1: one letter, a high bar, no overlay box in any row',
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
    name: 'alphafold_confidence-7',
    // the one stretch of the C-terminal region the mean rises over
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp(bumpResidues.start - 12, 20),
      ...tracks,
      ...gff,
      showDomainLegend: false,
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
        text: 'the overlay boxes stop on both sides of these columns',
        fontSize: 16,
        maxWidth: 480,
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
    // the two tracks, the four strips, the domain highlights and the per-row
    // overlay in one view
    viewportWidth: 1600,
    viewportHeight: 900,
    url: fileSnap({
      ...wide,
      height: 540,
      ...tracks,
      ...gff,
      ...rowTable,
      showDomainLegend: false,
      highlights: layers.highlights,
    }),
    settle: 3000,
    clip: 'viewer',
  },
]
