// The tutorials in docs/tutorials, in reading order. The markdown is the page;
// this list holds the index card text and the browser title, which markdown has
// no field for. Adding a tutorial means a file there plus an entry here.
export interface Tutorial {
  /** basename of the file in docs/tutorials, without .md */
  slug: string
  title: string
  blurb: string
}

export const tutorials: Tutorial[] = [
  {
    slug: 'protein_family',
    title: 'A protein family from a list of accessions',
    blurb:
      'Twelve UniProt accessions to an alignment, a tree and Pfam domains, in four commands outside the viewer. Every step has a figure, and the last one is a link that shows which lineages lost a domain.',
  },
  {
    slug: 'p53_variant_effects',
    title: "Where p53's damaging variants fall",
    blurb:
      'ClinVar, AlphaMissense and a saturation screen, each a bar per residue over the same fifteen-species p53 alignment. The three sources share no data and draw over the same columns.',
  },
  {
    slug: 'spike_structure',
    title: 'The SARS-CoV-2 furin insert and PDB 6VXX',
    blurb:
      'Eleven coronavirus spikes, the four residues only SARS-CoV-2 carries, and a SIFTS correspondence recording which residues of that row PDB 6VXX resolved.',
  },
  {
    slug: 'kinase_pocket',
    title: 'Reading cross-reactivity off the kinase pocket',
    blurb:
      '474 human kinase domains aligned with hmmalign, with a FastTree tree. The page compares the ATP-pocket residues of kinases imatinib inhibits with those it does not; the gatekeeper column reads threonine in 19% of them.',
  },
  {
    slug: 'rna_family',
    title: 'An RNA family, from a model and six genomes',
    blurb:
      'Search six bacterial genomes with an Rfam covariance model, align the 37 hits back to it, and read the consensus structure off the result: helix arcs, a pseudoknot, and the columns that hold still because the ligand touches them.',
  },
  {
    slug: 'phylogeny_at_scale',
    title: 'An RSV phylogeny from a public Nextstrain build',
    blurb:
      'A Nextstrain tree of 1,840 RSV genomes, reconstructed to one whole-genome alignment and opened at every scale from the whole tree to a single variable column.',
  },
  {
    slug: 'codon_selection',
    title: 'TRIM5 and the primate antiviral arms race',
    blurb:
      '32 TRIM5 orthologs to a codon alignment, a tree, an exon structure and a per-codon dN/dS track from HyPhy. Ends on a link where the variable patch behind HIV-1 restriction has high dN/dS and a zinc-finger control has low dN/dS.',
  },
]

export const tutorialBySlug = new Map(tutorials.map(t => [t.slug, t]))
