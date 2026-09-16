// Figures for docs/tutorials/gene_neighborhoods.md: the tryptophan operon of
// twelve bacteria, one row of strand arrows per genome in that genome's own
// coordinates, with the tree built from TrpB beside them.
//
// Every figure loads the hosted copies of the files the tutorial's build script
// writes (data/neighborhoods/*), so a figure and the ?data= link under it open
// the same view. The first and the last figure carry the TrpB alignment; the
// three between them have no msa at all, and the features panel is the only
// thing on the column scale.

import { fileSnap } from '../snap.mjs'

const tree = { treeFilehandle: { uri: 'data/neighborhoods/trpB.nwk' } }
const gff = {
  gffFilehandle: { uri: 'data/neighborhoods/trp-neighborhoods.gff' },
}
const msa = { msaFilehandle: { uri: 'data/neighborhoods/trpB.afa' } }

// One color per trp gene name, the map the tutorial's ?data= links carry. Key
// order is legend order, and a gene the map leaves out draws grey.
const nameColors = {
  trpL: '#76b7b2',
  trpE: '#4e79a7',
  trpG: '#a0cbe8',
  trpD: '#f28e2b',
  trpC: '#59a14f',
  trpCF: '#8cd17d',
  trpF: '#b6992d',
  trpB: '#e15759',
  trpA: '#b07aa1',
  trpI: '#9c755f',
}

// the four values the role attribute takes across the file
const roleColors = {
  trp: '#4e79a7',
  regulator: '#e15759',
  pseudogene: '#f28e2b',
  other: '#d9d9d9',
}

const byName = {
  color: { field: 'Name', scale: { map: nameColors } },
  label: 'Name',
}
const alignOnTrpE = [{ type: 'align', on: 'trpE' }]

// twelve rows at 26px, with room for the longest label (B_thetaiotaomicron)
const base = { height: 430, treeAreaWidth: 250, rowHeight: 26 }

const panel = (width, extra) => ({
  kind: 'features',
  x: 'position',
  width,
  header: 'trp neighborhood',
  ...extra,
})

export const specs = [
  {
    name: 'gene_neighborhoods-1',
    // The marker: 12 TrpB proteins aligned, with the tree drawn from them.
    viewportWidth: 1600,
    viewportHeight: 700,
    url: fileSnap({
      ...base,
      height: 480,
      ...msa,
      ...tree,
      colWidth: 2.9,
      colorSchemeName: 'clustalx_protein_dynamic',
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'gene_neighborhoods-2',
    // Tree, GFF and one features panel, with no alignment: each row runs in
    // its own window coordinates, so nothing lines up.
    viewportWidth: 1600,
    url: fileSnap({
      ...base,
      ...tree,
      ...gff,
      rowPanels: [panel(1120, { encoding: byName })],
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'gene_neighborhoods-3',
    // The align transform on trpE: every row carrying trpE starts it at one x.
    viewportWidth: 1600,
    url: fileSnap({
      ...base,
      ...tree,
      ...gff,
      rowPanels: [panel(1120, { encoding: byName, transform: alignOnTrpE })],
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'gene_neighborhoods-4',
    // The same spans colored by the role attribute instead, which is the
    // panel's own encoding over a second field.
    viewportWidth: 1600,
    url: fileSnap({
      ...base,
      ...tree,
      ...gff,
      rowPanels: [
        panel(1120, {
          encoding: {
            color: { field: 'role', scale: { map: roleColors } },
            label: 'Name',
          },
          transform: alignOnTrpE,
        }),
      ],
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'gene_neighborhoods-5',
    // The panel beside the alignment the tree came from: the 423 TrpB columns
    // and the neighborhood in one figure, with the alignment's own overlay off.
    viewportWidth: 1600,
    viewportHeight: 700,
    url: fileSnap({
      ...base,
      height: 480,
      ...msa,
      ...tree,
      ...gff,
      colWidth: 0.9,
      colorSchemeName: 'clustalx_protein_dynamic',
      // the GFF's positions are genome coordinates, so the overlay that reads
      // them as residues of each row stays off
      showDomains: false,
      rowPanels: [panel(760, { encoding: byName, transform: alignOnTrpE })],
    }),
    settle: 2500,
    clip: 'viewer',
  },
]
