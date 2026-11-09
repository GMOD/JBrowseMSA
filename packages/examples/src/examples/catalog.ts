// Data only, with no React and no alignment strings, so a build-time consumer
// can import it without pulling in the viewer.
//
// `description` is the blurb over the live example on the examples page.
// index.ts joins this list to the components.

export const categoryOrder = [
  'Getting started',
  'API & control',
  'Protein domains',
  'Protein structure',
  'Conservation & diffing',
  'Phylogeny',
  'RNA structure',
  'Genes & DNA',
] as const

export type Category = (typeof categoryOrder)[number]

export interface CatalogEntry {
  id: string
  name: string
  category: Category
  description: string
}

// Stable URL/anchor slug derived from an example name, shared by the examples
// page and the website so deep links match.
export const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

export const catalog: CatalogEntry[] = [
  {
    id: 'ZeroConfig',
    name: 'Zero-config viewer',
    category: 'Getting started',
    description:
      'MSAViewer with msaFilehandle and treeFilehandle pointing at a hosted alignment and tree.',
  },
  {
    id: 'LoadFromUrl',
    name: 'Load from URL',
    category: 'Getting started',
    description:
      'Fetch a remote Stockholm alignment plus an InterProScan domain GFF.',
  },
  {
    id: 'LoadByAccession',
    name: 'Load a family by accession',
    category: 'Getting started',
    description:
      'Type a Pfam or Rfam accession and the page fetches its seed alignment ' +
      'from EBI. An Rfam seed brings its tree and its consensus structure ' +
      'track.',
  },
  {
    id: 'ModelApi',
    name: 'Model API',
    category: 'API & control',
    description:
      'Create the model yourself with MSAModelF and render it with MSAView.',
  },
  {
    id: 'PanelControls',
    name: 'Controls from props',
    category: 'API & control',
    description:
      'Drive the mounted viewer from props (a diff toggle, an expand button, ' +
      'a color-scheme switch) with no model API and no remount, as a page ' +
      'embedding one panel usually needs. With drawTree={false}, the gutter ' +
      'fits the labels alone.',
  },
  {
    id: 'YourOwnControls',
    name: 'Your own controls',
    category: 'API & control',
    description:
      'The viewer with its toolbar left out (hideHeader), in the dark theme, ' +
      'driven by the page’s own controls. onCellClick and onViewportChange ' +
      'report the clicked residue and the columns on screen back to the page.',
  },
  {
    id: 'SvgFigure',
    name: 'An SVG figure in the page',
    category: 'API & control',
    description:
      'The live viewer above an SVG figure of what it shows. useMsaSvgFigure ' +
      'runs the SVG export after each scroll or zoom settles. The figure’s row ' +
      'names and residues are text, so the browser’s find locates them and a ' +
      'reader can select and copy them.',
  },
  {
    id: 'Nightingale',
    name: 'Inside a Nightingale page',
    category: 'API & control',
    description:
      'The viewer as a <jbrowse-msa> custom element inside a ' +
      '<nightingale-manager>, kept on one range with Nightingale’s navigation ' +
      'bar and sequence track.',
  },
  {
    id: 'ProgrammaticControl',
    name: 'Programmatic control',
    category: 'API & control',
    description: 'Drive the viewer by calling model actions from buttons.',
  },
  {
    id: 'ColumnTracks',
    name: 'Tracks from data',
    category: 'API & control',
    description:
      'Draw a number you computed per residue as a track, through the columnTracks prop.',
  },
  {
    id: 'ColorSchemes',
    name: 'Color schemes',
    category: 'API & control',
    description:
      'Switch color schemes at runtime via model.setColorSchemeName.',
  },
  {
    id: 'TreeOptions',
    name: 'Tree options',
    category: 'API & control',
    description:
      'Toggle branch lengths, label alignment, node bubbles, and the tree panel.',
  },
  {
    id: 'KinaseContacts',
    name: 'Domain packing (Src autoinhibition)',
    category: 'Protein domains',
    description:
      'Ten Src-family kinases with their InterPro domains, and arcs for the ' +
      'contacts between domains in PDB 2SRC, such as the tail that clamps the ' +
      'kinase shut.',
  },
  {
    id: 'P53ClinVar',
    name: 'Where the disease variants are (p53 + ClinVar)',
    category: 'Protein domains',
    description:
      'Conservation, InterPro domains and ClinVar pathogenic missense counts ' +
      'over the same p53 columns. 94% of the variants land in the DNA-binding ' +
      'domain.',
  },
  {
    id: 'GlobinSuperposition',
    name: 'Superposing structures by the alignment (globins)',
    category: 'Protein structure',
    description:
      'Five human globins from AlphaFold DB, superposed on the alignment’s ' +
      'own correspondences, with the CA distance after the fit as a column ' +
      'track.',
  },
  {
    id: 'KinaseFacets',
    name: 'Kinase groups side by side in 3D',
    category: 'Protein structure',
    description:
      'Eight human kinases from four kinome groups, one structure panel per ' +
      'group, superposed into one frame with the cameras tied. The fit ' +
      'follows the selection: pick a lobe or drag along the ruler, and the ' +
      'CA distance track follows.',
  },
  {
    id: 'P53Hotspots3D',
    name: 'Where the p53 disease variants sit in 3D',
    category: 'Protein structure',
    description:
      'The p53 ClinVar hotspots as a highlights layer, drawn on the alignment ' +
      'and on the AlphaFold or experimental structure.',
  },
  {
    id: 'AdenylateKinaseHinge',
    name: 'A domain motion, fitted three ways (adenylate kinase)',
    category: 'Protein structure',
    description:
      'Adenylate kinase open (4AKE) and closed (1AKE), fitted on every pair, ' +
      'with outliers set aside, or on the core alone, and the CA distance ' +
      'track shows how far the two lids swing.',
  },
  {
    id: 'HemoglobinChains',
    name: 'Two rows on two chains of one entry (hemoglobin)',
    category: 'Protein structure',
    description:
      'The alpha and beta rows map onto chains A and B of 4HHB, so a hovered ' +
      'cell lights its residue on its own row’s chain.',
  },
  {
    id: 'RowIdentifiers',
    name: 'Rows named any way (p53)',
    category: 'Protein structure',
    description:
      'A RefSeq id, an entry name, a FASTA header, a bare accession and a ' +
      'name with no id, and the structure each one finds.',
  },
  {
    id: 'FoldseekReplay',
    name: 'Structures for a row with no id (Foldseek, replayed)',
    category: 'Protein structure',
    description:
      'A recorded Foldseek search for an unnamed globin, mapped in the ' +
      'browser onto AlphaFold models and the PDB assembly files it searched.',
  },
  {
    id: 'DomainLetterColors',
    name: 'Domain boxes or colored letters (p53)',
    category: 'Protein domains',
    description:
      'residueEncoding picks what colorScheme paints: fill colors the cell, ' +
      'where domain boxes also draw, and color colors the letter, leaving ' +
      'each domain a bar under its row.',
  },
  {
    id: 'Nlrp1',
    name: 'Domain loss across orthologs (NLRP1)',
    category: 'Protein domains',
    description:
      'Twelve NLRP1 orthologs that share a six-domain core, with the ' +
      'N-terminal PYD present in some lineages and lost in others.',
  },
  {
    id: 'Hox',
    name: 'One conserved domain (Hox homeodomain)',
    category: 'Protein domains',
    description:
      'Thirteen human Hox proteins, one per paralog group. They align poorly ' +
      'everywhere except the ~60-residue homeodomain that binds DNA, and the ' +
      'overlay marks that one block, the single module that defines the family.',
  },
  {
    id: 'Opsins',
    name: 'Color vision (opsin duplications)',
    category: 'Protein domains',
    description:
      'Vertebrate visual pigments, with the tree sorting them by opsin class, ' +
      'following the gene duplications behind color vision.',
  },
  {
    id: 'Aquaporin',
    name: 'Channel family (aquaporins)',
    category: 'Protein domains',
    description:
      'The aquaporin (MIP) family, also one shared domain in every row. The ' +
      'tree splits on what the channel passes and not on species: water-only ' +
      'channels on one side, the "_glycerol" aquaglyceroporins on the other.',
  },
  {
    id: 'Myd88',
    name: 'Reference dots (MyD88 across bats)',
    category: 'Conservation & diffing',
    description:
      'MyD88 across mammals incl. bats, diffed against human (relativeTo) so ' +
      'identical residues show as dots and lineage-specific changes stand out, ' +
      'beside the inferred tree.',
  },
  {
    id: 'Ace2',
    name: 'Host range (ACE2 / SARS-CoV-2 receptor)',
    category: 'Conservation & diffing',
    description:
      'ACE2 across mammals diffed against human, with the 20 residues that ' +
      'touch the SARS-CoV-2 spike in PDB 6M0J marked.',
  },
  {
    id: 'HistoneH4',
    name: 'Extreme conservation (histone H4)',
    category: 'Conservation & diffing',
    description:
      'Histone H4 across eukaryotes diffed against human. One of the most ' +
      'conserved proteins known, it renders almost entirely as dots.',
  },
  {
    id: 'Insulin',
    name: 'Processing vs conservation (insulin)',
    category: 'Conservation & diffing',
    description:
      'Preproinsulin across vertebrates diffed against human: the B and A ' +
      'chains stay conserved while the cleaved C-peptide drifts. Arcs mark ' +
      'the three disulfide bonds.',
  },
  {
    id: 'Globin',
    name: 'One variant, three numbering systems (sickle cell)',
    category: 'Phylogeny',
    description:
      'The sickle-cell substitution has three numbers: residue 7 of the ' +
      'UniProt row, p.Glu7Val in HGVS, and residue 6 of chain B in PDB 1A3N. ' +
      'The SIFTS residueMappings layer converts between them.',
  },
  {
    id: 'CytochromeC',
    name: 'Deep phylogeny (cytochrome c)',
    category: 'Phylogeny',
    description:
      'A hundred-residue protein that every aerobe has, from mammals to ' +
      'plants and fungi. It is short enough to read whole and differs enough ' +
      'between kingdoms to date them; Fitch and Margoliash built the ' +
      'molecular clock on cytochrome c.',
  },
  {
    id: 'Prestin',
    name: 'Convergent evolution (prestin / echolocation)',
    category: 'Phylogeny',
    description:
      'Prestin (SLC26A5): echolocating bats and toothed whales convergently ' +
      'evolved shared changes, so the "_echo" species cluster together against ' +
      'the species tree.',
  },
  {
    id: 'Ef1a',
    name: 'Tree of life (EF-1α / EF-Tu)',
    category: 'Phylogeny',
    description:
      'The same elongation factor in bacteria, archaea and eukaryotes, about ' +
      'as far apart as two sequences get while staying alignable. The tree ' +
      'splits the three domains of life.',
  },
  {
    id: 'PfamGlobin',
    name: 'A whole Pfam family (20,705 rows)',
    category: 'Phylogeny',
    description:
      'PF00042, the Globin family, loaded straight from the InterPro API: ' +
      '20,705 sequences over 672 columns. The gappy-column slider hides the ' +
      'insertions.',
  },
  {
    id: 'A3m',
    name: 'The alignment a predictor sees (A3M)',
    category: 'Phylogeny',
    description:
      'The A3M MSA AlphaFold2 was given for hemoglobin beta: 1,211 rows whose ' +
      'lowercase insertions spread 146 match columns across 2,086. Hiding the ' +
      'gappy columns restores the profile.',
  },
  {
    id: 'LargeTree',
    name: 'Tree from the file (lysine riboswitch)',
    category: 'Phylogeny',
    description:
      'An Rfam seed alignment (RF00168) of 60 rows that carries its own tree ' +
      'in the Stockholm header. The parser reads that tree and the viewer ' +
      'draws it, with no Newick file and no tree inference.',
  },
  {
    id: 'Nextstrain',
    name: 'Nextstrain pathogens',
    category: 'Phylogeny',
    description:
      'Real Nextstrain phylogenies (SARS-CoV-2, Zika, Ebola, measles, RSV-A) ' +
      'reconstructed into a gap-free reference-coordinate MSA. Nextstrain ' +
      'stores tips as mutations against the reference, so building the ' +
      'alignment needs no aligner.',
  },
  {
    id: 'Trna',
    name: 'RNA secondary structure (tRNA)',
    category: 'RNA structure',
    description:
      'Transfer RNA (Rfam RF00005): the Stockholm SS_cons cloverleaf renders ' +
      'as a secondary-structure track, coloring the acceptor stem and D/' +
      'anticodon/T arms by base-pairing above the alignment.',
  },
  {
    id: 'CoronaFse',
    name: 'Pseudoknot (coronavirus frameshift element)',
    category: 'RNA structure',
    description:
      'The coronavirus frameshift element (Rfam RF00507), whose pseudoknot ' +
      'crosses stem 1. The arc track draws the crossing, which the bracket ' +
      'track cannot show.',
  },
  {
    id: 'Hammerhead',
    name: 'Ribozyme structure (hammerhead)',
    category: 'RNA structure',
    description:
      'Hammerhead ribozyme (Rfam RF00008), a small self-cleaving catalytic ' +
      'RNA. The SS_cons track shows its three-way helix junction colored by ' +
      'base-pairing.',
  },
  {
    id: 'F12',
    name: 'Gene loss + exon structure (F12 in cetaceans)',
    category: 'Genes & DNA',
    description:
      'A coding alignment of factor XII with its 14 exons overlaid. A shared ' +
      'frameshift in exon 3 and premature stops disable F12 in cetaceans.',
  },
  {
    id: 'CodonView',
    name: 'Codons against a reference (F12)',
    category: 'Genes & DNA',
    description:
      'The F12 coding alignment read codon by codon against a row you pick: ' +
      'synonymous changes fill blue, non-synonymous orange, stops black. ' +
      'Against human, the four cetaceans share a 1-bp deletion at codon 69.',
  },
  {
    id: 'GeneCluster',
    name: 'Gene arrow map (gggenes-style)',
    category: 'Genes & DNA',
    description:
      'A gene cluster across 6 genomes drawn as strand arrows over an ' +
      'alignment. The arrows anchor to alignment columns, so an inverted gene ' +
      'and a deleted one still line up.',
  },
]
