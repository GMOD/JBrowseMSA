// Screenshot specs for the demo app (packages/app). Each spec loads the app at a
// URL, optionally runs a few actions (clicking the icon menus), then captures
// either the viewer container (clip: 'viewer') or the whole viewport (for menus
// and dialogs that render in portals outside the viewer).
//
// The app reads a `?data=` URL param as a JSON model snapshot, so we can
// deep-link a fully loaded alignment instead of driving the import form.

import fs from 'node:fs'

import { hasData, readJson } from './exampleConsts.mjs'
import { fileSnap } from './snap.mjs'

// The phylogeny examples (MyD88/globin/ACE2/opsins/…) are real datasets built
// reproducibly into the examples package by scripts/examples-gen. The opsin
// domain GFF is an out-of-band InterProScan product (see
// scripts/examples-gen/README.md); keep the opsin spec out until it's present.
const hasOpsinDomains = hasData('opsins-domains.gff')

// Layers the examples import as JSON and the specs draw from the same file, so
// a regenerated layer reaches the figure and the live example together.
const sickle = readJson('hemoglobinSickle.json')
const ace2Interface = readJson('ace2Interface.json')
const p53ClinVar = readJson('p53ClinVar.json')
const kinaseStructure = readJson('kinaseStructure.json')

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
    // the logo track ships hidden, and `turnedOffTracks` holds the user's
    // explicit choice with the value meaning "off" -- so `false` is how a
    // deep-link turns it on, which is also what this exercises
    url: data({
      colorSchemeName: 'maeditor',
      height: 260,
      turnedOffTracks: { 'sequence-logo': false, conservation: true },
    }),
    clip: 'viewer',
  },
  {
    // Was 'settings-dialog', driving file menu -> "More settings" -> a modal
    // with "Tree options"/"MSA options" sections. That dialog is gone: Header
    // now renders TreeSettingsMenu and MSASettingsMenu as their own dropdowns
    // (the combined SettingsMenu.tsx isn't mounted at all), so the old spec had
    // been failing on a menu item that exists nowhere in the source.
    name: 'settings-menu',
    url: data({ colorSchemeName: 'maeditor' }),
    actions: [
      { click: '[data-testid="msa_settings_menu"]' },
      { waitFor: '::-p-text(Draw letters)' },
    ],
    // clip: 'full' is required (the menu renders in a portal outside the
    // viewer), so the viewport is sized to the content instead — a four-item
    // dropdown in the default 720px frame is mostly empty space.
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
      msaFilehandle: { uri: 'data/kinase.fa' },
      treeFilehandle: { uri: 'data/kinase.nh' },
      gffFilehandle: { uri: 'data/kinase-domains.gff' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'domain-loss',
    // whole 1666-column alignment on screen (colWidth < 1) so the architecture
    // reads as blocks: every row carries the NACHT/WH/HD2 + FIIND/UPA/CARD core
    // in the same columns, and the N-terminal PYD block is present in only five
    // of the twelve rows — the gap under it is the missing module.
    // Wider viewport + colWidth chosen so 1666 columns end left of the domain
    // legend (absolutely positioned top-right, 260px), which would otherwise
    // cover the C-terminal CARD block that completes the shared core.
    viewportWidth: 1600,
    url: fileSnap({
      height: 340,
      treeAreaWidth: 150,
      colWidth: 0.7,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/nlrp1.fa' },
      treeFilehandle: { uri: 'data/nlrp1.nh' },
      gffFilehandle: { uri: 'data/nlrp1-domains.gff' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  // The controlled pair behind docs/media/column-lock.png. Same twelve
  // sequences, same domain GFF, same component, same palette, same tree (so the
  // rows sit in the same order in both). The ONLY difference is whether the
  // input was aligned — which is exactly the variable the figure is about.
  //
  // colWidth is set per panel so both span the same ~1166px (1666 aligned
  // columns vs 1537 unaligned), putting the two x-axes on a common scale: each
  // panel spans the full extent of its own data, which is how the comparison
  // would be drawn by hand.
  {
    name: 'column-lock-residues',
    part: true,
    viewportWidth: 1600,
    // No gaps inserted, so column N is residue N: this draws each protein's
    // domains against its own residue ruler, anchored at residue 1 — what a
    // domain-architecture cartoon shows.
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
      msaFilehandle: { uri: 'data/nlrp1.fa' },
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
    // substantiate what the overview only asserts: the seven rows without a PYD
    // are not empty there. Mouse is mostly gap but Cow and Zebrafish carry real
    // residues — they simply have no pyrin domain called over them. An overview
    // drawn at colWidth 0.7 cannot show that, and a figure that claimed
    // "missing sequence" instead of "no domain annotated" would be wrong.
    viewportWidth: 1600,
    // tall enough for all 12 rows plus the label: zoomed in, the minimap and
    // both conservation tracks take ~180px before the first row, and Hedgehog
    // (the last row, and one of the five that HAS a PYD) is the one a short
    // panel drops
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
      msaFilehandle: { uri: 'data/nlrp1.fa' },
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
    // The whole Globin family (PF00042) straight from the InterPro API: 20,705
    // rows x 672 columns, 3 MB gzipped on the wire, 20 MB of Stockholm once
    // decompressed. This spec and the a3m one below are the only two that fetch
    // from the internet rather than from the served app -- the point of both is
    // that the file is the one its source publishes, not a prepared copy.
    // rowHeight 2 puts ~250 rows on screen at once. allowedGappyness 50 drops
    // the 556 columns that are at least half gaps -- a Pfam full alignment
    // gives every insertion its own columns and at this depth most belong to
    // one sequence -- leaving the 116 columns of the fold itself, at a colWidth
    // that fills the frame. A narrow tree gutter: there is no tree, and row
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
  // The A3M pair: the same OpenProteinSet alignment drawn twice, differing only
  // in whether the insert columns are hidden. That is what A3M's raggedness
  // costs -- 1,186 of the 1,207 rows carry an insertion, and expanding them
  // into a rectangle spreads the query's 146 match columns over 2,086.
  {
    name: 'a3m-inserts-raw',
    part: true,
    viewportWidth: 1500,
    // Fetched from OpenProteinSet rather than the served app, as the pfam spec
    // is from InterPro: the point of both is the file as its source publishes
    // it.
    url: fileSnap({
      height: 330,
      treeAreaWidth: 130,
      colWidth: 0.62,
      rowHeight: 1.5,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: {
        uri: 'https://openfold.s3.amazonaws.com/pdb/1a3n_B/a3m/bfd_uniclust_hits.a3m',
      },
    }),
    settle: 8000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'AS PARSED — 2,086 columns, because every insertion gets its own',
        fontSize: 16,
        // absolute, not anchored to the rows: 1,207 rows at 1.5px reach far
        // below a 330px panel, so a row-anchored label would land off-frame
        maxWidth: 900,
        x: 200,
        y: 330,
      },
    ],
  },
  {
    name: 'a3m-inserts-match',
    part: true,
    viewportWidth: 1500,
    // allowedGappyness 50 keeps the 129 columns where at least half the rows
    // have a residue, which is the profile the search was run against.
    url: fileSnap({
      height: 330,
      treeAreaWidth: 130,
      colWidth: 9,
      rowHeight: 1.5,
      allowedGappyness: 50,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: {
        uri: 'https://openfold.s3.amazonaws.com/pdb/1a3n_B/a3m/bfd_uniclust_hits.a3m',
      },
    }),
    settle: 8000,
    clip: 'viewer',
    annotations: [
      {
        type: 'text',
        text: 'INSERT COLUMNS HIDDEN — the 129 columns half the hits agree on',
        fontSize: 16,
        color: '#1565c0',
        maxWidth: 900,
        x: 200,
        y: 330,
      },
    ],
  },
  {
    name: 'a3m-inserts',
    parts: ['a3m-inserts-raw', 'a3m-inserts-match'],
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
    name: 'reference-dots',
    // relativeTo=Human: identical residues render as ".", so the lineage-
    // specific MyD88 substitutions (and the bat clade) stand out next to the
    // inferred tree. Readable column width so the dots/letters are legible.
    url: fileSnap({
      height: 460,
      treeAreaWidth: 150,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/myd88.fa' },
      treeFilehandle: { uri: 'data/myd88.nh' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'gene-duplication',
    // globin family: the tree groups by globin TYPE across species, the
    // signature of gene duplication
    url: fileSnap({
      height: 420,
      treeAreaWidth: 215,
      colWidth: 7,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/globin.fa' },
      treeFilehandle: { uri: 'data/globin.nh' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'sickle-cell',
    // The globins with the two layers the sickle-cell example carries: the
    // AlphaMissense per-residue mean over the hemoglobin beta row, and a band
    // on the substitution itself -- row residue 7, which is 1A3N residue 6, a
    // conversion the shipped SIFTS mapping is what makes. Zoomed to the start
    // of the beta chain so the band is legible rather than a hairline.
    url: fileSnap({
      height: 480,
      treeAreaWidth: 215,
      colWidth: 14,
      rowHeight: 20,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/globin.fa' },
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
  },
  {
    name: 'host-range',
    // ACE2 diffed against human, with the spike-contact residues marked: the 20
    // residues of human ACE2 within 4 A of the receptor-binding domain in PDB
    // 6M0J (scripts/examples-gen/ace2Interface.mjs). Dots inside a band are
    // species that keep the contact; letters are the substitutions that change
    // how well the virus binds.
    url: fileSnap({
      height: 460,
      treeAreaWidth: 250,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/ace2.fa' },
      treeFilehandle: { uri: 'data/ace2.nh' },
      highlights: ace2Interface.highlights.map((h, i) => ({
        ...h,
        color: 'rgba(214,39,40,0.35)',
        ...(i === 0 ? { label: 'spike contacts (6M0J)' } : {}),
      })),
    }),
    settle: 2500,
    clip: 'viewer',
  },
  ...(hasOpsinDomains
    ? [
        {
          name: 'opsin-classes',
          // vertebrate opsins: tree sorts by opsin class, with the real
          // InterProScan 7TM-GPCR domain overlay across each sequence
          url: fileSnap({
            height: 420,
            treeAreaWidth: 200,
            colWidth: 4,
            colorSchemeName: 'clustalx_protein_dynamic',
            msaFilehandle: { uri: 'data/opsins.fa' },
            treeFilehandle: { uri: 'data/opsins.nh' },
            gffFilehandle: { uri: 'data/opsins-domains.gff' },
          }),
          settle: 2500,
          clip: 'viewer',
        },
      ]
    : []),
  {
    name: 'extreme-conservation',
    // histone H4 vs human: one of the most conserved proteins known renders
    // almost entirely as dots, with only the distant lineages showing letters
    url: fileSnap({
      height: 300,
      treeAreaWidth: 150,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/histone_h4.fa' },
      treeFilehandle: { uri: 'data/histone_h4.nh' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'deep-phylogeny',
    // cytochrome c from mammals to plants/fungi: the tree spans >1 billion years
    url: fileSnap({
      height: 320,
      treeAreaWidth: 160,
      colWidth: 9,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/cytochrome_c.fa' },
      treeFilehandle: { uri: 'data/cytochrome_c.nh' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'convergent-evolution',
    // prestin: the echolocating bat + toothed whales ("_echo") group together,
    // pulled off the species tree by convergent selection
    url: fileSnap({
      height: 440,
      treeAreaWidth: 230,
      colWidth: 2,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/prestin.fa' },
      treeFilehandle: { uri: 'data/prestin.nh' },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'within-protein-conservation',
    // p53 with its InterProScan domains overlaid (diffed against human): the
    // overlay maps the functional architecture onto the alignment — the central
    // DNA-binding domain dominates, flanked by the short N-terminal motifs, with
    // the reference diff showing as dots in the unannotated linkers. Domains
    // read better at this whole-protein zoom than the raw rainbow ever could.
    url: fileSnap({
      height: 480,
      treeAreaWidth: 175,
      colWidth: 3,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/p53.fa' },
      treeFilehandle: { uri: 'data/p53.nh' },
      gffFilehandle: { uri: 'data/p53-domains.gff' },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'rna-secondary-structure',
    // tRNA (Rfam RF00005): the Stockholm #=GC SS_cons cloverleaf renders as a
    // dedicated Secondary-structure track above the alignment, the acceptor
    // stem + D/anticodon/T arms colored by base-pairing. Tree comes from the
    // embedded #=GF NH. A capability no other gallery figure shows.
    url: fileSnap({
      height: 450,
      treeAreaWidth: 175,
      colorSchemeName: 'nucleotide',
      msaFilehandle: { uri: 'data/trna.stock' },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'clinvar-variants',
    // p53 with three answers to "which part matters" stacked on one set of
    // columns: conservation computed from the alignment, InterPro domain boxes,
    // and ClinVar's pathogenic missense variants per residue -- which the
    // viewer computes nothing for. 94% of them fall in the DNA-binding domain.
    url: fileSnap({
      height: 420,
      treeAreaWidth: 150,
      colWidth: 2.4,
      colorSchemeName: 'clustalx_protein_dynamic',
      relativeTo: 'Human',
      // the domain overlay says the same thing as the two bands but paints
      // every row of every domain, which buries the bars this figure is about
      turnedOffTracks: { 'property-conservation': true },
      msaFilehandle: { uri: 'data/p53.fa' },
      treeFilehandle: { uri: 'data/p53.nh' },
      highlights: [
        { row: 'Human', start: 100, end: 288, label: 'DNA-binding domain' },
        { row: 'Human', start: 319, end: 357, label: 'Tetramerization' },
      ],
      columnTracks: [
        {
          id: 'clinvar',
          name: 'ClinVar pathogenic',
          kind: 'bar',
          row: 'Human',
          color: '#c0392b',
          height: 90,
          values: p53ClinVar.counts,
          max: p53ClinVar.max,
        },
      ],
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'domain-contacts',
    // The Src-family kinases with the domain overlay AND a contact map from
    // 2SRC over it: the boxes name the domains, the arcs show how they pack.
    // Red is the autoinhibitory clamp -- the C-terminal tail's phospho-Tyr527
    // bound by the protein's own SH2 domain.
    url: fileSnap({
      height: 320,
      treeAreaWidth: 200,
      colWidth: 1.6,
      colorSchemeName: 'clustalx_protein_dynamic',
      showDomainLegend: false,
      // the arcs and the domain boxes are the figure; the conservation
      // histograms would take a third of it to say nothing about either
      turnedOffTracks: { conservation: true, 'property-conservation': true },
      msaFilehandle: { uri: 'data/kinase.fa' },
      treeFilehandle: { uri: 'data/kinase.nh' },
      gffFilehandle: { uri: 'data/kinase-domains.gff' },
      columnTracks: [
        {
          id: 'contacts',
          name: 'Domain contacts (2SRC)',
          kind: 'arc',
          row: 'SRC_HUMAN',
          height: 110,
          arcs: kinaseStructure.contacts.map(({ start, end, pair }) => ({
            start,
            end,
            color:
              pair.includes('SH2') && pair.includes('tail')
                ? '#e15759'
                : pair.includes('tail')
                  ? '#f28e2b'
                  : pair.includes('SH3')
                    ? '#59a14f'
                    : '#4e79a7',
          })),
        },
      ],
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'pseudoknot-arcs',
    // Coronavirus frameshift element (Rfam RF00507): the Base pairs track draws
    // SS_cons as arcs, and the pseudoknot -- written A/a in WUSS because it
    // crosses stem 1 instead of nesting in it -- crosses the helices it cannot
    // nest inside. The bracket text track above draws the same annotation as
    // characters, where the crossing is invisible.
    url: fileSnap({
      height: 462,
      treeAreaWidth: 215,
      colWidth: 11,
      colorSchemeName: 'nucleotide',
      msaFilehandle: { uri: 'data/corona_fse.stock' },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'tree-of-life',
    // EF-1a/EF-Tu across bacteria, archaea, eukaryotes; labels prefixed
    // Euk_/Arc_/Bac_ so the three-domain grouping reads off the tree
    url: fileSnap({
      height: 420,
      treeAreaWidth: 215,
      colWidth: 2,
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/ef1a.fa' },
      treeFilehandle: { uri: 'data/ef1a.nh' },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'processing-conservation',
    // insulin vs human: conserved B/A chains (dots) vs the variable cleaved-out
    // C-peptide (letters)
    url: fileSnap({
      height: 320,
      treeAreaWidth: 150,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      msaFilehandle: { uri: 'data/insulin.fa' },
      treeFilehandle: { uri: 'data/insulin.nh' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'f12-exon-architecture',
    // F12 coding alignment with its 14-exon gene structure overlaid (each exon
    // a distinct color, the same color across species). Zoomed out so the whole
    // gene's exon architecture reads straight down the alignment and the
    // cetacean clade clusters in the tree. Loads from hosted files (large
    // alignment + exon GFF), like real-domains/large-tree.
    url: fileSnap({
      height: 470,
      treeAreaWidth: 150,
      colWidth: 0.7,
      colorSchemeName: 'nucleotide',
      msaFilehandle: { uri: 'data/f12-cetacean-cds.stock' },
      gffFilehandle: { uri: 'data/f12-cetacean-exons.gff' },
    }),
    viewportWidth: 1500,
    settle: 3500,
    clip: 'viewer',
  },
  {
    name: 'f12-frameshift',
    // zoomed to exon 3 (alignment col 205, highlighted): a single-column deletion
    // shared by exactly the four cetaceans (gap) but intact in human/manatee/land
    // mammals — the shared inactivating frameshift, in gene-structure (exon) color.
    url: fileSnap({
      height: 470,
      treeAreaWidth: 150,
      colWidth: 14,
      scrollX: -2240,
      highlightColumns: [205],
      colorSchemeName: 'nucleotide',
      msaFilehandle: { uri: 'data/f12-cetacean-cds.stock' },
      gffFilehandle: { uri: 'data/f12-cetacean-exons.gff' },
    }),
    viewportWidth: 1400,
    settle: 3500,
    clip: 'viewer',
  },
  {
    name: 'gene-arrow-map',
    // gggenes-style gene arrow map over a real alignment: each gene one color
    // down the columns, +/- strand drawn as a left/right arrowhead. genC is
    // inverted in Genome_4 and genE in Genome_6 (the arrow flips); genB is
    // deleted in Genome_5 — its columns gap out, yet the downstream genes stay
    // column-aligned, the payoff of anchoring arrows to the alignment. colWidth
    // 1 fits the whole cluster; tall rows so the arrowheads read clearly.
    url: fileSnap({
      height: 360,
      treeAreaWidth: 170,
      colWidth: 1,
      rowHeight: 44,
      colorSchemeName: 'nucleotide',
      msaFilehandle: { uri: 'data/gene-cluster.stock' },
      gffFilehandle: { uri: 'data/gene-cluster.gff' },
    }),
    viewportWidth: 1200,
    settle: 2000,
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
