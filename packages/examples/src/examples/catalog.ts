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
    id: 'LoadFromUrl',
    name: 'Load from URLs',
    category: 'Getting started',
    description:
      'MSAViewer with msaUrl, treeUrl and gffUrl pointing at a hosted ' +
      'alignment, tree and InterProScan domain GFF.',
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
    id: 'A3m',
    name: 'The alignment a predictor sees (A3M)',
    category: 'Getting started',
    description:
      'The A3M MSA AlphaFold2 was given for hemoglobin beta: 1,211 rows whose ' +
      'lowercase insertions spread 146 match columns across 2,086. Hiding the ' +
      'gappy columns restores the profile.',
  },
  {
    id: 'ModelApi',
    name: 'Model API',
    category: 'API & control',
    description:
      'Create the model yourself with MSAModelF, render it with MSAView, and ' +
      'drive it from buttons that call its actions: column width, row ' +
      'height, fit, color scheme and the tree display switches.',
  },
  {
    id: 'YourOwnControls',
    name: 'Your own controls',
    category: 'API & control',
    description:
      'The viewer with its toolbar left out (hideHeader), in the dark theme, ' +
      'driven by the page’s own controls through props, with no remount. ' +
      'onCellClick and onViewportChange report the clicked residue and the ' +
      'columns on screen back to the page.',
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
      'domain. residueEncoding switches the color scheme between the cell, ' +
      'under the domain boxes, and the letter, with each domain a bar.',
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
      'cell lights its residue on its own row’s chain. The sickle-cell ' +
      'substitution is residue 7 of the UniProt row and residue 6 of chain ' +
      'B, beside an AlphaMissense track.',
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
    id: 'Ace2',
    name: 'Host range (ACE2 / SARS-CoV-2 receptor)',
    category: 'Conservation & diffing',
    description:
      'ACE2 across mammals diffed against human, with the 20 residues that ' +
      'touch the SARS-CoV-2 spike in PDB 6M0J marked.',
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
    id: 'ProteinFamilies',
    name: 'Protein families and their trees',
    category: 'Phylogeny',
    description:
      'Ten families, each an alignment, its inferred tree and for most its ' +
      'InterPro domains: gene duplication in the globins and opsins, ' +
      'convergence in prestin, domain loss in NLRP1, the three domains of ' +
      'life in EF-1α, and MyD88 and histone H4 diffed against human.',
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
    id: 'RnaFamilies',
    name: 'RNA families and their secondary structure',
    category: 'RNA structure',
    description:
      'Four Rfam seeds with their SS_cons track: the tRNA cloverleaf, the ' +
      'hammerhead ribozyme junction, the coronavirus frameshift pseudoknot ' +
      'on an arc track, and a lysine riboswitch whose tree comes from the ' +
      'Stockholm file.',
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
