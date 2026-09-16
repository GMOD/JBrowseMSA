/**
 * Figures for docs/tutorials/protein_complex.md: hemoglobin alpha and beta from
 * eleven vertebrates as one concatenated row per species, with the residue
 * pairs in contact between the chains of PDB 2HHB drawn as arcs from the alpha
 * block to the beta block.
 *
 * The spec reads every callout position from the files the build script wrote
 * (packages/app/public/data/hemoglobin), so a re-run that moves a column moves
 * the callouts with it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fileSnap } from '../snap.mjs'

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/app/public/data/hemoglobin',
)
const read = name => fs.readFileSync(path.join(dataDir, name), 'utf8')

const layers = JSON.parse(read('hemoglobin-layers.json'))
const ROW = 'Human'

const aligned = {}
let name
for (const line of read('hemoglobin.afa').split('\n')) {
  if (line.startsWith('>')) {
    name = line.slice(1).trim()
    aligned[name] = ''
  } else if (name) {
    aligned[name] += line.trim()
  }
}

// residue of ROW (1-based) -> 0-based alignment column
const columnOfResidue = []
for (const [i, char] of [...aligned[ROW]].entries()) {
  if (char !== '-') {
    columnOfResidue.push(i)
  }
}
const col = residue => columnOfResidue[residue - 1]

const [contacts, classes] = layers.columnTracks
const [alphaMapping, betaMapping] = layers.residueMappings
const betaStart = betaMapping.segments[0].rowStart
const alphaEnd = alphaMapping.segments[0].rowEnd
const structure = alphaMapping.structure.id

// the alpha1beta2 pair the page checks by hand: Tyr42 of alpha and Asp99 of
// beta, in the row's numbering
const tyr42 = alphaMapping.segments[0].rowStart + 42 - 1
const asp99 = betaStart + 99 - 1
const tyrAsp = contacts.arcs.find(a => a.start === tyr42 && a.end === asp99)
if (!tyrAsp) {
  throw new Error(`no ${structure} contact between row ${tyr42} and ${asp99}`)
}

// the alpha1beta1 pair whose two residues vary the most across the rows, the
// same choice the build script prints
const rows = Object.values(aligned)
const identity = residue => {
  const c = col(residue)
  const ref = aligned[ROW][c]
  return rows.filter(s => s[c] === ref).length / rows.length
}
const [alpha1beta1Color] = contacts.arcs.map(a => a.color)
const variable = contacts.arcs
  .filter(a => a.color === alpha1beta1Color)
  .reduce((best, a) =>
    identity(a.start) + identity(a.end) <
    identity(best.start) + identity(best.end)
      ? a
      : best,
  )

const files = {
  msaFilehandle: { uri: 'data/hemoglobin/hemoglobin.afa' },
  treeFilehandle: { uri: 'data/hemoglobin/hemoglobin.nwk' },
}
const gff = {
  gffFilehandle: { uri: 'data/hemoglobin/hemoglobin-subunits.gff' },
}
const tracks = { columnTracks: [contacts, classes] }
const mappings = { residueMappings: layers.residueMappings }

// 290 columns at 4.4px fill a 1600px viewport beside a 150px tree
const wide = {
  height: 460,
  treeAreaWidth: 150,
  colWidth: 4.4,
  rowHeight: 22,
  colorSchemeName: 'clustalx_protein_dynamic',
  ...files,
}
// a close-up starts a few columns left of its feature, so the frame shows some
// context
const closeUp = (startCol, colWidth) => ({
  height: 520,
  treeAreaWidth: 150,
  colWidth,
  rowHeight: 22,
  scrollX: -startCol * colWidth,
  colorSchemeName: 'clustalx_protein_dynamic',
  ...files,
})

export const specs = [
  {
    name: 'protein_complex-1',
    // the concatenation: alpha then beta in every row, the tree from both
    viewportWidth: 1600,
    url: fileSnap(wide),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `alpha, residues 1-${alphaEnd} of the Human row`,
        fontSize: 16,
        anchor: { col: col(1), alignX: 'left', alignY: 'bottom', dy: 34 },
      },
      {
        type: 'text',
        text: `beta, residues ${betaStart}-${betaMapping.rowLength}`,
        fontSize: 16,
        anchor: {
          col: col(betaStart),
          alignX: 'left',
          alignY: 'bottom',
          dy: 34,
        },
      },
    ],
  },
  {
    name: 'protein_complex-2',
    // the subunit spans from the GFF, one box per chain per row
    viewportWidth: 1600,
    url: fileSnap({ ...wide, ...gff, showDomainLegend: false }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'protein_complex-3',
    // the boundary at residue resolution: the last alpha residues and the first
    // beta residues of every row, with the Cow beta two residues shorter
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp(col(alphaEnd) - 24, 22),
      ...gff,
      showDomainLegend: false,
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: col(alphaEnd), colEnd: col(betaStart) },
        pad: 3,
      },
      {
        type: 'text',
        text: `alpha ends and beta begins: residue ${alphaEnd} and ${betaStart} of the Human row`,
        fontSize: 16,
        maxWidth: 620,
        anchor: {
          col: col(alphaEnd),
          colEnd: col(betaStart),
          alignY: 'bottom',
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'protein_complex-4',
    // every residue pair in contact across a chain interface, as an arc from
    // its alpha column to its beta column, colored by interface
    viewportWidth: 1600,
    url: fileSnap({ ...wide, height: 540, ...tracks, ...mappings }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: `${contacts.arcs.length} residue pairs of ${structure} within 4 A across a chain interface`,
        fontSize: 16,
        maxWidth: 620,
        anchor: { col: col(1), alignX: 'left', alignY: 'bottom', dy: 34 },
      },
    ],
  },
  {
    name: 'protein_complex-5',
    // the alpha1beta2 pair at residue resolution, read against the Human row:
    // a dot is the same residue, and both columns are dots to the bottom
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp(col(tyrAsp.start) - 8, 22),
      height: 600,
      relativeTo: ROW,
      ...tracks,
      ...mappings,
      highlights: [
        {
          row: ROW,
          start: tyrAsp.start,
          end: tyrAsp.start,
          label: 'alpha Tyr42',
        },
      ],
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: col(tyrAsp.start) },
        pad: 3,
      },
      {
        type: 'text',
        text: 'alpha Tyr42: a dot in every other row',
        fontSize: 16,
        maxWidth: 420,
        anchor: {
          col: col(tyrAsp.start),
          alignX: 'left',
          alignY: 'bottom',
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'protein_complex-6',
    // the alpha1beta1 pair that varies the most, at the same resolution: the
    // control, where the letters under the box change from row to row
    viewportWidth: 1600,
    url: fileSnap({
      ...closeUp(col(variable.start) - 8, 22),
      height: 600,
      relativeTo: ROW,
      ...tracks,
      ...mappings,
      highlights: [
        {
          row: ROW,
          start: variable.start,
          end: variable.start,
          label: `alpha ${variable.start - alphaMapping.segments[0].rowStart + 1}`,
        },
      ],
    }),
    settle: 2500,
    clip: 'viewer',
    annotations: [
      {
        type: 'box',
        anchor: { col: col(variable.start) },
        pad: 3,
      },
      {
        type: 'text',
        text: `alpha ${variable.start - alphaMapping.segments[0].rowStart + 1}, at the alpha1beta1 interface: a different letter in most rows`,
        fontSize: 16,
        maxWidth: 560,
        anchor: {
          col: col(variable.start),
          alignX: 'left',
          alignY: 'bottom',
          dy: 46,
        },
      },
    ],
  },
  {
    name: 'protein_complex-7',
    // the whole thing: the subunit GFF loaded with its overlay off, the two
    // tracks above, and the residue mappings in the link
    viewportWidth: 1600,
    url: fileSnap({
      ...wide,
      ...gff,
      showDomains: false,
      showDomainLegend: false,
      ...tracks,
      ...mappings,
    }),
    settle: 2500,
    clip: 'viewer',
  },
]
