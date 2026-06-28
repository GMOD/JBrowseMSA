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
