// Screenshot specs for the demo app (packages/app). Each spec loads the app at a
// URL, optionally runs a few actions (clicking the icon menus), then captures
// either the viewer container (clip: 'viewer') or the whole viewport (for menus
// and dialogs that render in portals outside the viewer).
//
// The app reads a `?data=` URL param as a JSON model snapshot, so we can
// deep-link a fully loaded alignment instead of driving the import form.

import { hasConst, readConst } from './exampleConsts.mjs'

// The phylogeny examples (MyD88/globin/ACE2/opsins/…) are real datasets built
// reproducibly into the examples package by scripts/examples-gen. The opsin
// domain GFF is an out-of-band InterProScan product (see
// scripts/examples-gen/README.md); keep the opsin spec out until it's present.
const hasOpsinDomains = hasConst('opsinDomainsGFF')

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

// Like data(), but with no inline-alignment default: for specs that load their
// (large) alignment from a hosted file via *Filehandle props pointing at
// data/<file> (written by scripts/screenshots/writeExampleData.mjs, served at
// the app root). Keeps the deep-link a few hundred bytes instead of tens of KB.
// The uri is relative, so it resolves against the page — localhost during
// capture, gmod.org/JBrowseMSA/demo/ once deployed.
function fileSnap(msaview) {
  const snap = { msaview: { type: 'MsaView', ...msaview } }
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
    name: 'settings-dialog',
    url: data({ colorSchemeName: 'maeditor' }),
    actions: [
      { click: '[data-testid="file_menu"]' },
      { click: '::-p-text(More settings)' },
      { waitFor: '::-p-text(Tree options)' },
    ],
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
      msaFilehandle: { uri: 'data/nlrp1.aln' },
      treeFilehandle: { uri: 'data/nlrp1.nh' },
      gffFilehandle: { uri: 'data/nlrp1-domains.gff' },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'domain-loss-annotated',
    // The same capture as domain-loss, with the reading annotated: what is
    // missing on the left, and what lines up on the right. Every callout is
    // anchored to an alignment COLUMN range, so it tracks the domain rather
    // than a pixel — re-running the aligner moves the boxes with the data.
    // Column ranges are the Human row's domain spans (scripts/examples-gen).
    viewportWidth: 1600,
    url: fileSnap({
      height: 430,
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
      { type: 'box', anchor: { col: 38, colEnd: 112 }, pad: 3 },
      {
        type: 'box',
        anchor: { col: 370, colEnd: 1636 },
        color: '#1565c0',
        pad: 3,
      },
      {
        type: 'text',
        text: 'PYD annotated in 5 of 12 rows\n(the other 7 have sequence here — just no pyrin domain)',
        fontSize: 15,
        maxWidth: 340,
        anchor: { col: 38, colEnd: 112, alignY: 'bottom', dy: 46 },
      },
      {
        type: 'text',
        text: 'the other six domains: all 12 rows, same columns',
        fontSize: 15,
        color: '#1565c0',
        anchor: { col: 370, colEnd: 1636, alignY: 'bottom', dy: 46 },
      },
    ],
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
    name: 'large-tree',
    url: fileSnap({
      height: 480,
      treeAreaWidth: 300,
      colorSchemeName: 'nucleotide',
      msaFilehandle: { uri: 'data/lysine.stock' },
    }),
    settle: 3500,
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
    name: 'reference-dots',
    // relativeTo=Human: identical residues render as ".", so the lineage-
    // specific MyD88 substitutions (and the bat clade) stand out next to the
    // inferred tree. Readable column width so the dots/letters are legible.
    url: data({
      height: 460,
      treeAreaWidth: 150,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: readConst('myd88MSA'),
        tree: readConst('myd88Tree'),
      },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'gene-duplication',
    // globin family: the tree groups by globin TYPE across species, the
    // signature of gene duplication
    url: data({
      height: 420,
      treeAreaWidth: 215,
      colWidth: 7,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: readConst('globinMSA'),
        tree: readConst('globinTree'),
      },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'host-range',
    // ACE2 diffed against human; the few divergent spike-contact residues in
    // the N-terminal peptidase domain pop out of the otherwise-conserved protein
    url: data({
      height: 460,
      treeAreaWidth: 250,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: readConst('ace2MSA'),
        tree: readConst('ace2Tree'),
      },
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
          url: data({
            height: 420,
            treeAreaWidth: 200,
            colWidth: 4,
            colorSchemeName: 'clustalx_protein_dynamic',
            data: {
              msa: readConst('opsinMSA'),
              tree: readConst('opsinTree'),
              gff: readConst('opsinDomainsGFF'),
            },
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
    url: data({
      height: 300,
      treeAreaWidth: 150,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: readConst('histoneH4MSA'),
        tree: readConst('histoneH4Tree'),
      },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'deep-phylogeny',
    // cytochrome c from mammals to plants/fungi: the tree spans >1 billion years
    url: data({
      height: 320,
      treeAreaWidth: 160,
      colWidth: 9,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: readConst('cytochromeCMSA'),
        tree: readConst('cytochromeCTree'),
      },
    }),
    settle: 2000,
    clip: 'viewer',
  },
  {
    name: 'convergent-evolution',
    // prestin: the echolocating bat + toothed whales ("_echo") group together,
    // pulled off the species tree by convergent selection
    url: data({
      height: 440,
      treeAreaWidth: 230,
      colWidth: 2,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: readConst('prestinMSA'),
        tree: readConst('prestinTree'),
      },
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
    url: data({
      height: 480,
      treeAreaWidth: 175,
      colWidth: 3,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: readConst('p53MSA'),
        tree: readConst('p53Tree'),
        gff: readConst('p53DomainsGFF'),
      },
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
    url: data({
      height: 450,
      treeAreaWidth: 175,
      colorSchemeName: 'nucleotide',
      data: {
        msa: readConst('trnaMSA'),
      },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'tree-of-life',
    // EF-1a/EF-Tu across bacteria, archaea, eukaryotes; labels prefixed
    // Euk_/Arc_/Bac_ so the three-domain grouping reads off the tree
    url: data({
      height: 420,
      treeAreaWidth: 215,
      colWidth: 2,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: readConst('ef1aMSA'),
        tree: readConst('ef1aTree'),
      },
    }),
    settle: 2500,
    clip: 'viewer',
  },
  {
    name: 'processing-conservation',
    // insulin vs human: conserved B/A chains (dots) vs the variable cleaved-out
    // C-peptide (letters)
    url: data({
      height: 320,
      treeAreaWidth: 150,
      relativeTo: 'Human',
      colorSchemeName: 'clustalx_protein_dynamic',
      data: {
        msa: readConst('insulinMSA'),
        tree: readConst('insulinTree'),
      },
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
    url: data({
      height: 360,
      treeAreaWidth: 170,
      colWidth: 1,
      rowHeight: 44,
      colorSchemeName: 'nucleotide',
      data: {
        msa: readConst('geneClusterMSA'),
        gff: readConst('geneClusterGFF'),
      },
    }),
    viewportWidth: 1200,
    settle: 2000,
    clip: 'viewer',
  },
]
