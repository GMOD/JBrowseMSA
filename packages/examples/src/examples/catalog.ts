// Data only, with no React and no alignment strings, so a build-time consumer
// can import it without pulling in the viewer.
//
// `description` is the blurb over the live example on the examples page.
// index.ts joins this list to the components.

export const categoryOrder = [
  'Getting started',
  'API & control',
  'Protein domains',
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
      'The simplest usage: pass alignment + tree text as strings to MSAViewer.',
  },
  {
    id: 'LoadFromUrl',
    name: 'Load from URL',
    category: 'Getting started',
    description:
      'Fetch a remote Stockholm alignment plus an InterProScan domain GFF.',
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
      'embedding one panel usually needs. drawTree={false} with ' +
      'autoTreeAreaWidth sizes the gutter to the labels alone.',
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
      'The viewer as a custom element (<jbrowse-msa>) inside a ' +
      '<nightingale-manager>, beside Nightingale’s navigation bar and sequence ' +
      'track. The manager keeps the three on one range of human beta globin: ' +
      'brushing the bar zooms the alignment, and hovering a residue in the ' +
      'alignment highlights it in the sequence track.',
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
      'Ten Src-family kinases, their InterPro domains, and a contact map from ' +
      'the solved structure over the boxes. The boxes mark the SH3, SH2 and ' +
      'kinase domains, which line up in every member. The arcs mark how those ' +
      'domains pack: the C-terminal tail folds back so its phospho-Tyr527 ' +
      'binds the protein’s own SH2 domain and clamps the kinase shut. The arcs ' +
      'are C-beta pairs under 8 Å in PDB 2SRC, mapped to UniProt numbering ' +
      'through SIFTS and filtered to pairs joining two different domains.',
  },
  {
    id: 'P53ClinVar',
    name: 'Where the disease variants are (p53 + ClinVar)',
    category: 'Protein domains',
    description:
      'Three measures of which part of p53 matters, from three sources, on ' +
      'the same columns: conservation computed from the alignment, domain ' +
      'boxes from InterPro, and a columnTracks layer of the pathogenic ' +
      'missense variants ClinVar has on record per residue. 94% of those ' +
      'variants land inside the DNA-binding domain, with a second small ' +
      'cluster on the tetramerization domain.',
  },
  {
    id: 'DomainLetterColors',
    name: 'Domain boxes or colored letters (p53)',
    category: 'Protein domains',
    description:
      'colorScheme is the scale over residue letters, and residueEncoding is ' +
      'the channel it paints. On fill it colors the cell, which is where a ' +
      'domain box draws too, so the overlay wins the row and the residue ' +
      'colors go. On color it colors the letter, and each domain gives up its ' +
      'fill for a bar along the bottom of its row. p53 puts four InterPro ' +
      'domains on 16 orthologs, two of them in the first 60 residues. The ' +
      'standalone app has the same switch under Settings → Color letters ' +
      'instead of background of tiles.',
  },
  {
    id: 'Nlrp1',
    name: 'Domain loss across orthologs (NLRP1)',
    category: 'Protein domains',
    description:
      'Twelve NLRP1 orthologs that share a six-domain core but differ at the ' +
      'N terminus: the PYD is present in primates, dog and hedgehog and absent ' +
      'in rodents, artiodactyls, horse and fish. The core domains sit up to 391 ' +
      'residues apart between rows yet land within 2 alignment columns, ' +
      'because the overlay places domains by alignment column instead of by ' +
      'each protein’s own residue numbers.',
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
      'Vertebrate visual pigments, each one 7TM-GPCR domain end to end. They ' +
      'differ in the wavelength they absorb, and the tree sorts them by opsin ' +
      'class (rhodopsins, then the short-, mid- and long-wave cone opsins), ' +
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
      'ACE2 across mammals (bats, civet, pangolin, resistant rodents), diffed ' +
      'against human. The marked columns are the 20 ACE2 residues that touch ' +
      'the SARS-CoV-2 spike in PDB 6M0J, computed from the structure. A ' +
      'species whose contact residues differ from human shows letters inside ' +
      'the marked columns.',
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
      'Preproinsulin across vertebrates diffed against human. The B and A ' +
      'chains of mature insulin stay conserved (dots) while the cleaved-out ' +
      'C-peptide drifts (letters). The arc track carries the three disulfide ' +
      'bonds from UniProt, and two of them span the C-peptide, holding the ' +
      'hormone together after that piece is cut out.',
  },
  {
    id: 'Globin',
    name: 'One variant, three numbering systems (sickle cell)',
    category: 'Phylogeny',
    description:
      'The globin family (hemoglobin alpha/beta, myoglobin, neuroglobin, ' +
      'cytoglobin), whose tree groups by globin type and not by species, as ' +
      'gene duplication predicts. The beta chain carries the sickle-cell ' +
      'substitution, which has three numbers: residue 7 of the row (UniProt, ' +
      'counting the initiator methionine), p.Glu7Val in HGVS, and residue 6 ' +
      'of chain B in PDB 1A3N. The SIFTS residueMappings layer converts ' +
      'between them. The AlphaMissense track is the control: it scores the ' +
      'sickle variant 0.22, likely benign, because the mutant protein folds ' +
      'and carries oxygen. The disease comes from the polymerization that ' +
      'follows.',
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
      'PF00042, the Globin family, loaded from the InterPro API URL on the ' +
      'entry page with no preprocessing: 20,705 sequences over 672 columns, ' +
      '3 MB gzipped on the wire and 20 MB of Stockholm once decompressed. ' +
      'Only 116 of those columns carry more than half the sequences; the rest ' +
      'are insertions belonging to one member each, and the gappy-column ' +
      'slider hides them.',
  },
  {
    id: 'A3m',
    name: 'The alignment a predictor sees (A3M)',
    category: 'Phylogeny',
    description:
      'The MSA AlphaFold2 was given for hemoglobin beta, from OpenProteinSet: ' +
      '1,211 BFD/UniClust hits in A3M, where lowercase marks an insertion ' +
      'outside the profile. 1,186 rows carry one. The parser expands the ' +
      'insertions into the rectangle the viewer draws, which spreads the ' +
      'query’s 146 match columns across 2,086. Hiding the columns at least ' +
      'half the rows leave empty puts the profile back together.',
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
      'The frameshifting stimulation element that coronaviruses use to reach ' +
      'ORF1b (Rfam RF00507), across all four genera. Its pseudoknot crosses ' +
      'stem 1 instead of nesting inside it, so the seed writes it as the WUSS ' +
      'letter pair A/a. The arc track draws the crossing, which the bracket ' +
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
      'A DNA coding alignment of coagulation factor XII with its 14-exon gene ' +
      'structure overlaid, each exon the same color across species. F12 is ' +
      'intact in land mammals and the manatee but disabled in cetaceans by a ' +
      'shared frameshift in exon 3 and premature stops. The frameshift and ' +
      'stops show only in a nucleotide alignment.',
  },
  {
    id: 'GeneCluster',
    name: 'Gene arrow map (gggenes-style)',
    category: 'Genes & DNA',
    description:
      'A colinear gene cluster across 6 genomes with each gene drawn as a ' +
      'strand-directed arrow (gggenes-style), overlaid on an alignment. Each ' +
      'gene keeps one color down the columns. Two genes are inverted (the ' +
      'arrow flips) and one is deleted (its columns gap out), and every gene ' +
      'still lines up, because the arrows anchor to alignment columns instead ' +
      'of each genome’s own coordinates. scripts/gene-cluster builds the ' +
      'sequences synthetically, since a real cluster with exactly one ' +
      'inversion and one deletion is unlikely to exist.',
  },
]
