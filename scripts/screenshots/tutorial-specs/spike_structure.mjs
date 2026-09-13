/**
 * Figures for docs/tutorials/spike_structure.md: eleven coronavirus spikes, the
 * PRRA insertion SARS-CoV-2 alone carries, and which of its residues 6VXX
 * actually resolved.
 *
 * Everything the figures point at is read out of the files the build script
 * wrote (packages/app/public/data/spike), so a re-run that moves a column moves
 * the callouts with it: `col` comes from projecting a row residue through the
 * committed alignment, never from a measured pixel.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileSnap } from '../snap.mjs'

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/app/public/data/spike',
)
const read = name => fs.readFileSync(path.join(dataDir, name), 'utf8')

const layers = JSON.parse(read('spike-layers.json'))
const ROW = 'SARS-CoV-2'

const aligned = {}
let name
for (const line of read('spike.afa').split('\n')) {
  if (line.startsWith('>')) {
    name = line.slice(1).trim()
    aligned[name] = ''
  } else if (name) {
    aligned[name] += line.trim()
  }
}

// residue of ROW (1-based) -> 0-based alignment column, the same projection
// seqPosToGlobalCol does in the viewer
const columnOfResidue = []
for (const [i, char] of [...aligned[ROW]].entries()) {
  if (char !== '-') {
    columnOfResidue.push(i)
  }
}
const col = residue => columnOfResidue[residue - 1]

const highlight = label => layers.highlights.find(h => h.label === label)
const span = label => {
  const h = highlight(label)
  return { col: col(h.start), colEnd: col(h.end) }
}

const insert = highlight('PRRA insert')
const coverage = layers.columnTracks[0]
const mapping = layers.residueMappings[0]
const structure = mapping.structure.id
// the unobserved range the insert falls in, back in the row's own numbering
const [segment] = mapping.segments
const offset = segment.structStart - segment.rowStart
const loopRow = mapping.unobserved
  .find(
    ([start, end]) =>
      start <= insert.start + offset && end >= insert.end + offset,
  )
  .map(pos => pos - offset)

// the rows the domain GFF says nothing about, read from the GFF rather than
// listed here, so the callout follows a re-run
const annotated = new Set(
  read('spike-domains.gff')
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('\t')[0]),
)
const unannotated = Object.keys(aligned).filter(row => !annotated.has(row))

const files = {
  msaFilehandle: { uri: 'data/spike/spike.afa' },
  treeFilehandle: { uri: 'data/spike/spike.nwk' },
}
const domains = { gffFilehandle: { uri: 'data/spike/spike-domains.gff' } }
const wide = {
  height: 400,
  treeAreaWidth: 170,
  colWidth: 0.8,
  rowHeight: 22,
  colorSchemeName: 'clustalx_protein_dynamic',
  ...files,
}
// a close-up starts a few columns left of what it is about, so the frame
// carries context rather than opening on the feature's own edge
const closeUp = (startCol, colWidth) => ({
  height: 500,
  treeAreaWidth: 170,
  colWidth,
  rowHeight: 22,
  scrollX: -startCol * colWidth,
  colorSchemeName: 'clustalx_protein_dynamic',
  ...files,
})

export const specs = [
  {
    name: 'spike-structure-alignment',
    viewportWidth: 1600,
    url: fileSnap(wide),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'spike-structure-domains',
    viewportWidth: 1600,
    url: fileSnap({ ...wide, ...domains }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      ...unannotated.map(row => ({
        type: 'arrow',
        anchor: { col: col(120), rowLabel: row },
        fromAnchor: { col: col(330), alignY: 'bottom', dy: 28 },
        strokeWidth: 3,
      })),
      {
        type: 'text',
        text: 'no InterPro coordinates for these three rows',
        fontSize: 16,
        maxWidth: 460,
        anchor: { col: col(340), alignX: 'left', alignY: 'bottom', dy: 34 },
      },
    ],
  },
  {
    name: 'spike-structure-insertion',
    // base resolution over the S1/S2 junction, with every row read against
    // SARS-CoV-2: a dot is the same residue, a letter a different one, and the
    // insert is where ten rows have nothing at all
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp(col(insert.start) - 22, 22),
      relativeTo: ROW,
      highlights: layers.highlights,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: col(insert.start), colEnd: col(insert.end) },
        pad: 3,
      },
      {
        type: 'text',
        text: `${insert.label}, residues ${insert.start}-${insert.end}: the first three columns are gap in all ten other rows`,
        fontSize: 16,
        maxWidth: 560,
        anchor: {
          col: col(insert.start),
          colEnd: col(insert.end),
          alignY: 'bottom',
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'spike-structure-mapping',
    // the correspondence drawn over the whole alignment: green where 6VXX
    // resolved the residue, orange where the entity declares it and the map
    // has nothing, gray where the construct never had it
    viewportWidth: 1600,
    url: fileSnap({
      ...wide,
      height: 450,
      columnTracks: [coverage],
      highlights: layers.highlights,
      residueMappings: [mapping],
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: col(loopRow[0]), colEnd: col(loopRow[1]) },
        pad: 2,
      },
      {
        type: 'text',
        text: `orange above these columns: ${structure} declares residues ${loopRow[0]}-${loopRow[1]} and resolved none of them`,
        fontSize: 16,
        maxWidth: 560,
        anchor: {
          col: col(loopRow[0]),
          colEnd: col(loopRow[1]),
          alignY: 'bottom',
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'spike-structure-control',
    // HR1, the same row and the same structure, at base resolution: a helix
    // the crystal resolved end to end, under columns every spike here shares
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp(span('HR1').col - 8, 14),
      height: 520,
      columnTracks: [coverage],
      highlights: [highlight('HR1')],
      residueMappings: [mapping],
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `HR1: 51 residues, every one of them resolved in ${structure}`,
        fontSize: 16,
        maxWidth: 560,
        anchor: {
          col: span('HR1').col,
          alignX: 'left',
          alignY: 'bottom',
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'spike-structure-final',
    viewportWidth: 1600,
    url: fileSnap({
      ...wide,
      ...domains,
      showDomainLegend: false,
      columnTracks: [coverage],
      highlights: layers.highlights,
      residueMappings: [mapping],
    }),
    settle: 2500,
    clip: 'viewer',
  },
]
