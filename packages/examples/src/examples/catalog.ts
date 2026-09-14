// What each example is, in one place. This module is data only -- no React, no
// alignment strings -- so the website's gallery page can import it at build
// time without pulling the viewer in.
//
// One story, written once. `description` is the blurb over the live example on
// the examples page, and each entry in `figures` is a figure on the gallery
// page: `src` names the PNG in docs/media AND the screenshot spec that renders
// it (scripts/screenshots/specs.mjs), which is how the gallery's live link
// finds the state its figure was captured in. An example carries several
// figures when it shows several things; most carry none, because the gallery
// runs one figure per viewer capability rather than one per dataset.
//
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

export interface Figure {
  /** docs/media/<src>.png, and the spec of the same name that renders it */
  src: string
  title: string
  caption: string
}

export interface CatalogEntry {
  id: string
  name: string
  category: Category
  description: string
  figures?: Figure[]
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
      'Drive the mounted viewer from props — a diff toggle, an expand button, ' +
      'a color-scheme switch — with no model API and no remount, which is what ' +
      'a purpose-built page embedding one panel usually needs. Pairs ' +
      'drawTree={false} with autoTreeAreaWidth so the gutter shrinks to the ' +
      'labels instead of reserving room for a tree that is not drawn.',
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
      'the solved structure over the boxes. The boxes say the family is SH3 + ' +
      'SH2 + kinase and line those three up down every member; the arcs say ' +
      'how they pack, which is the mechanism — the C-terminal tail folds back ' +
      'so its phospho-Tyr527 binds the protein’s own SH2 domain and clamps the ' +
      'kinase shut. C-beta pairs under 8 Å in PDB 2SRC, mapped to UniProt ' +
      'numbering through SIFTS and filtered to pairs joining two different ' +
      'domains.',
    figures: [
      {
        src: 'real-domains',
        title: 'Domain architecture',
        caption:
          'The Src-family kinases with their InterPro domains: the shared SH3 + SH2 + kinase blocks line up down every member, so the family’s domain layout reads straight across the alignment.',
      },
      {
        src: 'domain-contacts',
        title: 'How the domains pack',
        caption:
          'The same kinases with a contact map from PDB 2SRC over the domain boxes. The boxes name the parts; the arcs say how those parts fold against each other. Red is the autoinhibitory clamp — the C-terminal tail doubling back so its phospho-Tyr527 binds the protein’s own SH2 domain. The pairs are placed on the human row’s residues, so the viewer projects them onto the alignment’s columns.',
      },
    ],
  },
  {
    id: 'P53ClinVar',
    name: 'Where the disease variants are (p53 + ClinVar)',
    category: 'Protein domains',
    description:
      'Three answers to "which part of this protein matters", from three ' +
      'different places, on the same columns: conservation computed from the ' +
      'alignment, domain boxes from InterPro, and — as a data layer the ' +
      'viewer computes nothing for — the pathogenic missense variants ClinVar ' +
      'has on record per residue. 94% of them land inside the DNA-binding ' +
      'domain, with a second small cluster on the tetramerization domain.',
    figures: [
      {
        src: 'within-protein-conservation',
        title: 'A dominant functional domain',
        caption:
          'p53’s InterPro domains overlaid: the central DNA-binding domain (red) — where most cancer mutations cluster — forms the bulk of the protein, flanked by the short N-terminal transactivation motifs. The overlay maps the functional architecture onto the alignment.',
      },
      {
        src: 'clinvar-variants',
        title: 'A layer the alignment cannot know',
        caption:
          'The same p53 orthologs, diffed against human, with two labeled bands and one track that came from somewhere else entirely: the missense variants ClinVar classifies as pathogenic, counted per residue. 94% of them fall inside the DNA-binding domain, and the small second cluster sits on the tetramerization motif. Conservation says where this family has not changed; this says where changing it causes disease, and the viewer computes none of it.',
      },
    ],
  },
  {
    id: 'Nlrp1',
    name: 'Domain loss across orthologs (NLRP1)',
    category: 'Protein domains',
    description:
      'Twelve NLRP1 orthologs that share a six-domain core but differ at the ' +
      'N terminus: the PYD is present in primates, dog and hedgehog and absent ' +
      'in rodents, artiodactyls, horse and fish. The core domains sit up to 391 ' +
      'residues apart between rows yet land within 2 alignment columns — which ' +
      'is why the overlay is column-locked and not drawn per-protein.',
    figures: [
      {
        src: 'domain-loss',
        title: 'Domain loss across orthologs',
        caption:
          'Twelve NLRP1 orthologs. Every row carries the same core — NACHT, winged helix, HD2, then FIIND/UPA and the CARD — and every one of those blocks lines up in the same columns. The N-terminal PYD (cyan) is there in only five rows, so the blank space under it is a module the other seven lack. Those core domains sit up to 391 residues apart between rows in their own coordinates; column-locking is what stacks them.',
      },
      {
        src: 'column-lock',
        title: 'Why the domain overlay is column-locked',
        caption:
          'The same twelve orthologs, the same domain GFF, the same palette and tree — the only difference is whether the input was aligned. Unaligned (top), column N is residue N and the shared domains scatter into a staircase. Aligned (bottom), they land in the same columns: NACHT starts at residue 328 in human and 93 in hamster, and both are drawn within one column of each other.',
      },
    ],
  },
  {
    id: 'Hox',
    name: 'One conserved domain (Hox homeodomain)',
    category: 'Protein domains',
    description:
      'Thirteen human Hox proteins, one per paralog group. They agree almost ' +
      'nowhere except the ~60-residue homeodomain that binds DNA, and the ' +
      'overlay marks exactly that block — the case where a family is defined ' +
      'by one module rather than by an architecture.',
  },
  {
    id: 'Opsins',
    name: 'Color vision (opsin duplications)',
    category: 'Protein domains',
    description:
      'Vertebrate visual pigments, all one 7TM-GPCR domain end to end. What ' +
      'separates them is not architecture but wavelength: the tree sorts them ' +
      'by opsin class — rhodopsins, then the short-, mid- and long-wave cone ' +
      'opsins — which is the duplication history of color vision.',
  },
  {
    id: 'Aquaporin',
    name: 'Channel family (aquaporins)',
    category: 'Protein domains',
    description:
      'The aquaporin (MIP) family, also one shared domain in every row. Here ' +
      'the tree splits on what the channel passes rather than on species: ' +
      'water-only channels on one side, the "_glycerol" aquaglyceroporins on ' +
      'the other.',
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
      'ACE2 across mammals — bats, civet, pangolin, resistant rodents — ' +
      'diffed against human. The marked columns are the 20 ACE2 residues that ' +
      'touch the SARS-CoV-2 spike in PDB 6M0J, taken off the structure rather ' +
      'than retyped from a paper, so "the contact residues differ in this ' +
      'species" is something the picture shows instead of asserting.',
    figures: [
      {
        src: 'host-range',
        title: 'Where a receptor is contacted',
        caption:
          'ACE2 orthologs diffed against human, with the spike-contact residues marked. The bands are the 20 residues of human ACE2 with an atom within 4 Å of the SARS-CoV-2 receptor-binding domain in PDB 6M0J, placed on the human row and projected through each ortholog’s gaps. Dots inside a band are species that keep the contact; letters are the substitutions that change how well the virus binds.',
      },
    ],
  },
  {
    id: 'HistoneH4',
    name: 'Extreme conservation (histone H4)',
    category: 'Conservation & diffing',
    description:
      'Histone H4 across eukaryotes diffed against human — one of the most ' +
      'conserved proteins known renders almost entirely as dots, the opposite ' +
      'extreme from a fast-evolving protein.',
    figures: [
      {
        src: 'extreme-conservation',
        title: 'Reference comparison (dots)',
        caption:
          'Diffing against a reference (relativeTo) collapses identical residues to dots so only the changes stand out. Histone H4, one of the most conserved proteins known, is almost entirely dots relative to human — only the most distant lineages differ.',
      },
    ],
  },
  {
    id: 'Insulin',
    name: 'Processing vs conservation (insulin)',
    category: 'Conservation & diffing',
    description:
      'Preproinsulin across vertebrates diffed against human — the B and A ' +
      'chains of mature insulin stay conserved (dots) while the cleaved-out ' +
      'C-peptide drifts (letters). The arc track carries the three disulfide ' +
      'bonds from UniProt: two of them vault the C-peptide, which is what ' +
      'holds the hormone together after that piece is cut out.',
    figures: [
      {
        src: 'processing-conservation',
        title: 'Post-translational processing',
        caption:
          'Insulin relative to human: the mature B and A chains stay conserved (dots) while the cleaved-out C-peptide drifts (letters) — the same dot-diffing reading out where a protein is under selection.',
      },
    ],
  },
  {
    id: 'Globin',
    name: 'One variant, three numbering systems (sickle cell)',
    category: 'Phylogeny',
    description:
      'The globin family — hemoglobin alpha/beta, myoglobin, neuroglobin, ' +
      'cytoglobin — whose tree groups by globin type rather than by species, ' +
      'the signature of gene duplication. On the beta chain sits the ' +
      'sickle-cell substitution, which has three numbers: residue 7 of the ' +
      'row (UniProt, counting the initiator methionine), p.Glu7Val in HGVS, ' +
      'and residue 6 of chain B in PDB 1A3N. The SIFTS residueMappings layer ' +
      'is what converts between them, and the AlphaMissense track is the ' +
      'control: it scores the sickle variant 0.22, likely benign, because the ' +
      'mutant protein folds and carries oxygen — and then polymerizes.',
    figures: [
      {
        src: 'gene-duplication',
        title: 'Gene duplication',
        caption:
          'The globin family groups by globin type across species rather than by species — alpha beside alpha, beta beside beta — the signature of ancient gene duplication read off the tree.',
      },
      {
        src: 'sickle-cell',
        title: 'One residue, three numbering systems',
        caption:
          'The same globins with two layers on the hemoglobin beta row: AlphaMissense’s mean predicted pathogenicity per residue, and a band on the sickle-cell substitution. The band is at row residue 7, which is p.Glu7Val in HGVS and residue 6 of PDB 1A3N chain B — the SIFTS mapping shipped beside it is what converts one into the other. AlphaMissense scores this variant likely benign, which is the honest answer to the question it was asked: sickle hemoglobin folds and carries oxygen, and then polymerizes.',
      },
    ],
  },
  {
    id: 'CytochromeC',
    name: 'Deep phylogeny (cytochrome c)',
    category: 'Phylogeny',
    description:
      'A hundred-residue protein that every aerobe has, from mammals to ' +
      'plants and fungi. Short enough to read whole, and different enough ' +
      'between kingdoms to date them — the alignment Fitch and Margoliash ' +
      'built the molecular clock on.',
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
      'The same elongation factor in bacteria, archaea and eukaryotes, which ' +
      'is as far apart as two sequences get while staying alignable. Where ' +
      'cytochrome c dates kingdoms, this one splits the three domains of life.',
    figures: [
      {
        src: 'tree-of-life',
        title: 'Tree of life',
        caption:
          'Elongation factor EF-1α/EF-Tu across bacteria, archaea, and eukaryotes — the label prefixes make the three domains of life read straight off a single inferred tree.',
      },
    ],
  },
  {
    id: 'PfamGlobin',
    name: 'A whole Pfam family (20,705 rows)',
    category: 'Phylogeny',
    description:
      'PF00042, the Globin family, loaded straight from the InterPro API: ' +
      '20,705 sequences over 672 columns, 3 MB gzipped on the wire and 20 MB ' +
      'of Stockholm once decompressed. Nothing is prepared for the viewer — ' +
      'this is the URL off the entry page. Only 116 of those columns carry ' +
      'more than half the sequences; the rest are insertions belonging to one ' +
      'member each, and the gappy-column slider is what takes them out.',
    figures: [
      {
        src: 'pfam-scale',
        title: 'Scale',
        caption:
          'The whole Globin family from Pfam (PF00042) as the InterPro API serves it: 20,705 sequences, 672 columns, 20 MB of Stockholm behind a 3 MB gzipped response. First painted column about three seconds after the page opens; after that the tiled canvas draws what is on screen rather than the alignment, so scrolling and zooming stay interactive. The 556 columns that are at least half gaps are hidden here — a Pfam full alignment gives every insertion its own columns, and at this depth most insertions belong to one sequence — leaving the 116 the globin fold occupies.',
      },
    ],
  },
  {
    id: 'A3m',
    name: 'The alignment a predictor sees (A3M)',
    category: 'Phylogeny',
    description:
      'The MSA AlphaFold2 was given for hemoglobin beta, from OpenProteinSet: ' +
      '1,211 BFD/UniClust hits in A3M, where lowercase marks an insertion ' +
      'outside the profile. 1,186 rows carry one, so the query’s 146 match ' +
      'columns end up spread across 2,086 once the parser expands the ' +
      'insertions into the rectangle the viewer draws — and hiding the columns ' +
      'at least half the rows leave empty puts the profile back together.',
    figures: [
      {
        src: 'a3m-inserts',
        title: 'A3M insertions',
        caption:
          'The AlphaFold2 input MSA for hemoglobin beta (OpenProteinSet, 1,211 BFD/UniClust hits), drawn twice. A3M leaves rows ragged: uppercase is a match column, lowercase an insertion outside the profile, and the parser widens each insertion slot to the longest insertion any row puts there — which is why the top panel is 2,086 mostly-empty columns. The bottom panel is the same data with the columns at least half gaps hidden: the 129 columns half the hits agree on, which is the profile the search was run against.',
      },
    ],
  },
  {
    id: 'LargeTree',
    name: 'Tree from the file (lysine riboswitch)',
    category: 'Phylogeny',
    description:
      'An Rfam seed alignment (RF00168) that carries its own tree in the ' +
      'Stockholm header, which the parser reads and the viewer draws — no ' +
      'Newick file, no inference, 60 rows of it.',
  },
  {
    id: 'Nextstrain',
    name: 'Nextstrain pathogens',
    category: 'Phylogeny',
    description:
      'Real Nextstrain phylogenies (SARS-CoV-2, Zika, Ebola, measles, RSV-A) ' +
      'reconstructed into a gap-free reference-coordinate MSA — no aligner ' +
      'needed since Nextstrain tips are stored as mutations against the ' +
      'reference.',
  },
  {
    id: 'Trna',
    name: 'RNA secondary structure (tRNA)',
    category: 'RNA structure',
    description:
      'Transfer RNA (Rfam RF00005): the Stockholm SS_cons cloverleaf renders ' +
      'as a secondary-structure track, coloring the acceptor stem and D/' +
      'anticodon/T arms by base-pairing above the alignment.',
    figures: [
      {
        src: 'rna-secondary-structure',
        title: 'RNA secondary structure',
        caption:
          'A tRNA alignment (Rfam RF00005): the Stockholm SS_cons cloverleaf renders as a dedicated secondary-structure track above the columns, with the acceptor stem and D-/anticodon-/T-arms colored by base-pairing.',
      },
    ],
  },
  {
    id: 'CoronaFse',
    name: 'Pseudoknot (coronavirus frameshift element)',
    category: 'RNA structure',
    description:
      'The frameshifting stimulation element that coronaviruses use to reach ' +
      'ORF1b (Rfam RF00507), across all four genera. Its pseudoknot crosses ' +
      'stem 1 instead of nesting inside it, which is why the seed writes it as ' +
      'the WUSS letter pair A/a and why the arc track shows something the ' +
      'bracket track cannot: arcs that cross.',
    figures: [
      {
        src: 'pseudoknot-arcs',
        title: 'Base pairs, including a pseudoknot',
        caption:
          'The coronavirus frameshifting stimulation element (Rfam RF00507) across all four genera. The Base pairs track draws the Stockholm SS_cons as arcs between the columns that pair: blue for the nested helices, red for the pseudoknot. A pseudoknot is by definition a pair that crosses a helix instead of nesting inside it, which is why WUSS has to write it as the letter pair A/a and why the bracket track directly above shows two runs of letters with no visible relationship. The arcs cross.',
      },
    ],
  },
  {
    id: 'Hammerhead',
    name: 'Ribozyme structure (hammerhead)',
    category: 'RNA structure',
    description:
      'Hammerhead ribozyme (Rfam RF00008), a small self-cleaving catalytic ' +
      'RNA: the SS_cons track shows its three-way helix junction colored by ' +
      'base-pairing — a catalytic-RNA counterpoint to the tRNA cloverleaf.',
  },
  {
    id: 'F12',
    name: 'Gene loss + exon structure (F12 in cetaceans)',
    category: 'Genes & DNA',
    description:
      'A DNA coding alignment of coagulation factor XII with its 14-exon gene ' +
      'structure overlaid (each exon the same color across species). F12 is ' +
      'intact in land mammals and the manatee but disabled in cetaceans by a ' +
      'shared frameshift in exon 3 + premature stops — pseudogenization read ' +
      'straight off the nucleotides, which a protein alignment cannot show.',
    figures: [
      {
        src: 'f12-exon-architecture',
        title: 'Gene structure overlay (DNA)',
        caption:
          'Coagulation factor XII coding alignment with its 14 exons overlaid — each exon the same color across species, through the same overlay path as InterPro domains (built by react-msaview-cli genestructure). The whole gene’s exon architecture reads straight down the alignment.',
      },
      {
        src: 'f12-frameshift',
        title: 'Pseudogenization (base resolution)',
        caption:
          'Zoomed to single nucleotides: F12 is intact in land mammals and the manatee, but a single-base deletion shared by exactly the four cetaceans — beside premature stops elsewhere — disables it. Gene loss visible at the base level, which a protein alignment cannot show.',
      },
    ],
  },
  {
    id: 'GeneCluster',
    name: 'Gene arrow map (gggenes-style)',
    category: 'Genes & DNA',
    description:
      'A colinear gene cluster across 6 genomes with each gene drawn as a ' +
      'strand-directed arrow (gggenes-style), overlaid on an alignment. Genes ' +
      'keep one color down the columns; two are inverted (the arrow flips) ' +
      'and one is deleted (its columns gap out) — yet every gene stays ' +
      'column-aligned, because the arrows are anchored to alignment columns ' +
      'rather than each genome’s own coordinate. The sequences are synthetic, ' +
      'built by scripts/gene-cluster: the overlay is the point, and a real ' +
      'cluster carrying exactly one inversion and one deletion would be a ' +
      'coincidence.',
    figures: [
      {
        src: 'gene-arrow-map',
        title: 'Gene-arrow map',
        caption:
          'A gggenes-style gene cluster across genomes, each gene a strand-directed arrow anchored to alignment columns: two genes are inverted (the arrow flips) and one deleted (its columns gap out), yet every gene stays column-aligned. Synthetic sequences, real overlay.',
      },
    ],
  },
]
