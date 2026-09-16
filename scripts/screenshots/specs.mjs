// Screenshot specs for the demo app (packages/app). Each spec loads the app at a
// URL, optionally runs a few actions (clicking the icon menus), then captures
// either the viewer container (clip: 'viewer') or the whole viewport (for menus
// and dialogs that render in portals outside the viewer).
//
// The app reads a `?data=` URL param as a JSON model snapshot, so a spec can
// deep-link a loaded alignment without driving the import form.

import fs from 'node:fs'

import { readJson } from './exampleConsts.mjs'
import { fileSnap } from './snap.mjs'

// The sickle-cell example imports this layer too, so a regenerated layer
// updates the figure and the live example together.
const sickle = readJson('hemoglobinSickle.json')

// Small IL2RA protein alignment + matching tree (same data as the examples).
const proteinMSA = `CLUSTAL O(1.2.3) multiple sequence alignment
UniProt|P26898|IL2RA_SHEEP      MEPSLLMWRFFVFIVVPGCVTEACHDDPPSLRNA----------MFKVLRYE----VGTM
UniProt|P01590|IL2RA_MOUSE      MEPRLLMLGFLSLTIVPSCRAELCLYDPPEVPNA----------TFKALSYK----NGTI
UniProt|P41690|IL2RA_FELCA      MEPSLLLWGILTFVVVHGHVTELCDENPPDIQHA----------TFKALTYK----TGTM
UniProt|P01589|IL2RA_HUMAN      MDSYLLMWGLLTFIMVPGCQAELCDDDPPEIPHA----------TFKAMAYK----EGTM
UniProt|Q5MNY4|IL2RA_MACMU      MDPYLLMWGLLTFITVPGCQAELCDDDPPKITHA----------TFKAVAYK----EGTM
UniProt|P26896|IL2RB_RAT        MATVDLSWRLPLYILLLLLATT--------------------------------WVSAAV
`

const proteinTree =
  '(((UniProt|P26898|IL2RA_SHEEP:0.24,(UniProt|P41690|IL2RA_FELCA:0.18,(UniProt|P01589|IL2RA_HUMAN:0.04,UniProt|Q5MNY4|IL2RA_MACMU:0.04):0.13):0.05):0.02,UniProt|P01590|IL2RA_MOUSE:0.23):0.07,UniProt|P26896|IL2RB_RAT:0.34);'

function data(extra) {
  const snap = {
    msaview: {
      type: 'MsaView',
      height: 185,
      treeAreaWidth: 250,
      data: { msa: proteinMSA, tree: proteinTree },
      ...extra,
    },
  }
  return `?data=${encodeURIComponent(JSON.stringify(snap))}`
}

export const specs = [
  {
    name: 'import-form',
    url: '',
    waitFor: '::-p-text(Examples)',
    clip: 'viewer',
  },
  {
    name: 'colorscheme-clustalx',
    url: data({ colorSchemeName: 'clustalx_protein_dynamic' }),
    clip: 'viewer',
  },
  {
    name: 'colorscheme-pid',
    url: data({ colorSchemeName: 'percent_identity_dynamic' }),
    clip: 'viewer',
  },
  {
    name: 'sequence-logo',
    // the logo track is hidden by default, and a `turnedOffTracks` value of
    // false turns it on from a deep link
    url: data({
      colorSchemeName: 'maeditor',
      height: 260,
      turnedOffTracks: { 'sequence-logo': false, conservation: true },
    }),
    clip: 'viewer',
  },
  {
    name: 'settings-menu',
    url: data({ colorSchemeName: 'maeditor' }),
    actions: [
      { click: '[data-testid="msa_settings_menu"]' },
      { waitFor: '::-p-text(Draw letters)' },
    ],
    // clip: 'full' is required because the menu renders in a portal outside
    // the viewer, so the viewport is sized to the content; a four-item dropdown
    // in the default 720px frame is mostly empty space.
    viewportHeight: 380,
    clip: 'full',
  },
  {
    name: 'real-domains',
    // zoomed out (small colWidth) so the full ~526-column alignment fits and
    // the shared SH3 + SH2 + kinase domain architecture shows as colored
    // blocks aligned down every member of the family
    url: fileSnap({
      height: 360,
      treeAreaWidth: 175,
      colWidth: 2,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/kinase.aln' },
      treeFilehandle: { uri: 'data/kinase.nh' },
      gffFilehandle: { uri: 'data/kinase-domains.gff' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'domain-loss',
    // whole 1666-column alignment on screen (colWidth < 1) so the domains show
    // as blocks: every row carries the NACHT/WH/HD2 + FIIND/UPA/CARD core in the
    // same columns, and the N-terminal PYD block is present in only five of the
    // twelve rows. The viewport and colWidth end the 1666 columns left of the
    // domain legend (absolutely positioned top-right, 220px), which would
    // otherwise cover the C-terminal CARD block.
    viewportWidth: 1600,
    url: fileSnap({
      height: 340,
      treeAreaWidth: 150,
      colWidth: 0.7,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/nlrp1.aln' },
      treeFilehandle: { uri: 'data/nlrp1.nh' },
      gffFilehandle: { uri: 'data/nlrp1-domains.gff' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  // The controlled pair behind docs/media/column-lock.png. Both panels use the
  // same twelve sequences, domain GFF, component, palette and tree (so the rows
  // sit in the same order), and differ only in whether the input was aligned.
  //
  // colWidth is set per panel so both span the same ~1166px (1666 aligned
  // columns vs 1537 unaligned), each covering the full extent of its own data.
  {
    name: 'column-lock-residues',
    part: true,
    viewportWidth: 1600,
    // No gaps inserted, so column N is residue N and each protein's domains
    // sit on its own residue ruler from residue 1, as in a domain-architecture
    // cartoon.
    url: fileSnap({
      height: 390,
      treeAreaWidth: 150,
      colWidth: 0.7586,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/nlrp1-unaligned.aln' },
      treeFilehandle: { uri: 'data/nlrp1.nh' },
      gffFilehandle: { uri: 'data/nlrp1-domains.gff' },
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'UNALIGNED — domains at their own residue positions',
        fontSize: 17,
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 34 },
      },
    ],
  },
  {
    name: 'column-lock-columns',
    part: true,
    viewportWidth: 1600,
    url: fileSnap({
      height: 390,
      treeAreaWidth: 150,
      colWidth: 0.7,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/nlrp1.aln' },
      treeFilehandle: { uri: 'data/nlrp1.nh' },
      gffFilehandle: { uri: 'data/nlrp1-domains.gff' },
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'ALIGNED — the same domains, column-locked',
        fontSize: 17,
        color: '#1565c0',
        anchor: { col: 0, alignX: 'left', alignY: 'bottom', dy: 34 },
      },
    ],
  },
  {
    name: 'column-lock',
    parts: ['column-lock-residues', 'column-lock-columns'],
  },
  {
    name: 'domain-loss-closeup',
    // Base resolution at the PYD block's left edge (alignment column 38), to
    // show that the seven rows without a PYD still have residues there. Mouse
    // is mostly gap, but Cow and Zebrafish carry residues with no pyrin domain
    // called over them. At colWidth 0.7 the overview cannot tell "missing
    // sequence" from "no domain annotated".
    viewportWidth: 1600,
    // tall enough for all 12 rows plus the label: zoomed in, the minimap and
    // both conservation tracks take ~180px before the first row, and a shorter
    // panel drops Hedgehog (the last row, and one of the five with a PYD)
    viewportHeight: 900,
    url: fileSnap({
      height: 520,
      treeAreaWidth: 150,
      colWidth: 14,
      rowHeight: 20,
      // scrollX is a negative px offset: put column 34 at the left edge, so the
      // PYD block (col 38) starts just inside the frame
      scrollX: -34 * 14,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/nlrp1.aln' },
      treeFilehandle: { uri: 'data/nlrp1.nh' },
      gffFilehandle: { uri: 'data/nlrp1-domains.gff' },
    }),
    settle: 2000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'same columns, base resolution: the PYD-less rows carry sequence here — there is just no pyrin domain over it',
        fontSize: 15,
        maxWidth: 900,
        anchor: { col: 38, alignX: 'left', alignY: 'bottom', dy: 34 },
      },
    ],
  },
  {
    name: 'pfam-scale',
    // The whole Globin family (PF00042) from the InterPro API: 20,705 rows x
    // 672 columns, 3 MB gzipped on the wire, 20 MB of Stockholm decompressed.
    // This spec and the a3m specs below fetch from the internet instead of the
    // served app, loading each file exactly as its source publishes it.
    // rowHeight 2 puts ~250 rows on screen at once. allowedGappyness 50 drops
    // the 556 columns that are at least half gaps (a Pfam full alignment gives
    // every insertion its own columns, and at this depth most belong to one
    // sequence), leaving the 116 columns of the fold at a colWidth that fills
    // the frame. The tree gutter is narrow because there is no tree and row
    // labels cannot draw at a 2px row.
    viewportWidth: 1600,
    url: fileSnap({
      height: 620,
      treeAreaWidth: 120,
      colWidth: 9,
      rowHeight: 2,
      allowedGappyness: 50,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: {
        uri: 'https://www.ebi.ac.uk/interpro/api/entry/pfam/PF00042/?annotation=alignment:full',
      },
    }),
    settle: 12000,
    clip: 'viewer',
  },
  {
    name: 'color-scheme-menu',
    url: data({ colorSchemeName: 'clustal' }),
    actions: [
      { click: '[data-testid="color_scheme_menu"]' },
      { waitFor: '::-p-text(percent_identity_dynamic)' },
    ],
    clip: 'full',
  },
  {
    name: 'tree-collapse',
    // collapse the (FELCA,(HUMAN,MACMU)) subclade; node ids are deterministic
    // from generateNodeIds (msa-parsers/src/util.ts): root 'node-0', each child
    // appends '-<index>-<depth>'. Collapsing it draws the clade as a triangle
    // labelled with its tip count and drops those rows (and the gaps they
    // introduced) from the MSA.
    url: data({ collapsed: ['node-0-0-1-0-2-1-3'] }),
    clip: 'viewer',
  },
  {
    name: 'export-svg-dialog',
    url: data({}),
    actions: [
      { click: '[data-testid="file_menu"]' },
      { click: '::-p-text(Export SVG)' },
      { waitFor: '::-p-text(Export type)' },
    ],
    clip: 'full',
  },
  {
    name: 'metadata-dialog',
    url: data({ data: { msa: proteinMSA, tree: proteinTree } }),
    actions: [
      { click: '[data-testid="file_menu"]' },
      { click: '::-p-text(Metadata)' },
      { waitFor: '::-p-text(sequence)' },
    ],
    clip: 'full',
  },
  {
    name: 'sickle-cell',
    // The globins with the two layers the sickle-cell example carries: the
    // AlphaMissense per-residue mean over the hemoglobin beta row, and a band
    // on the substitution at row residue 7, which the shipped SIFTS mapping
    // converts to 1A3N residue 6. Zoomed to the start of the beta chain so the
    // band is wider than a hairline.
    url: fileSnap({
      height: 480,
      treeAreaWidth: 215,
      colWidth: 14,
      rowHeight: 20,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/globin.aln' },
      treeFilehandle: { uri: 'data/globin.nh' },
      highlights: [
        {
          row: sickle.sickle.row,
          start: sickle.sickle.seqPos,
          end: sickle.sickle.seqPos,
          color: 'rgba(214,39,40,0.35)',
          label: sickle.sickle.label,
        },
      ],
      columnTracks: [
        {
          id: 'alphamissense',
          name: sickle.alphaMissense.name,
          kind: 'bar',
          row: sickle.alphaMissense.row,
          color: '#8e44ad',
          height: 70,
          values: sickle.alphaMissense.values,
          max: sickle.alphaMissense.max,
        },
      ],
    }),
    settle: 2500,
    clip: 'viewer',
    // The band is one column wide under a full-color alignment, so the figure
    // adds a callout box around it, anchored to the cell: 0-based column 21 of
    // the Human_beta row is its residue 7.
    annotations: [
      {
        type: 'box',
        anchor: { col: 21, rowLabel: 'Human_beta' },
        pad: 2,
      },
      {
        type: 'text',
        text: 'row residue 7 · p.Glu7Val · 1A3N B:6',
        fontSize: 15,
        maxWidth: 500,
        anchor: {
          col: 21,
          rowLabel: 'Human_beta',
          alignY: 'bottom',
          dy: 30,
        },
      },
    ],
  },
  {
    name: 'within-protein-conservation',
    // The site's og:image (layouts/Base.astro), so it is what a shared link
    // previews as. No page embeds it.
    //
    // p53 with its InterPro domains overlaid, diffed against human: the
    // central DNA-binding domain covers most of the protein, flanked by the
    // short N-terminal motifs, and the unannotated linkers show the reference
    // diff as dots.
    url: fileSnap({
      height: 480,
      treeAreaWidth: 175,
      colWidth: 3,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/p53.aln' },
      treeFilehandle: { uri: 'data/p53.nh' },
      gffFilehandle: { uri: 'data/p53-domains.gff' },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  ...(await tutorialSpecs()),
]

// One module per tutorial under tutorial-specs/, each exporting `specs`, so
// tutorials written in parallel don't all append to this array
async function tutorialSpecs() {
  const dir = new URL('tutorial-specs/', import.meta.url)
  const files = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter(f => f.endsWith('.mjs'))
        .sort()
    : []
  const modules = await Promise.all(
    files.map(f => import(new URL(f, dir).href)),
  )
  return modules.flatMap(m => m.specs)
}
