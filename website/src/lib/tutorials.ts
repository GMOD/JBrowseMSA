// The tutorials in docs/tutorials, in reading order. The markdown is the page;
// this is what the index card and the browser title need and markdown has no
// place to put. A new tutorial is a file there plus an entry here.
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
      'ClinVar, AlphaMissense and a saturation screen, each a bar per residue over the same fifteen-species p53 alignment. Three sources that share no data, one set of columns.',
  },
  {
    slug: 'spike_structure',
    title: 'The insertion the structure did not resolve',
    blurb:
      'Eleven coronavirus spikes, the four residues SARS-CoV-2 alone carries, and a SIFTS correspondence saying which residues of that row PDB 6VXX actually resolved.',
  },
  {
    slug: 'kinase_pocket',
    title: 'Reading cross-reactivity off the kinase pocket',
    blurb:
      '474 human kinase domains, hmmalign and FastTree, one alignment. The gatekeeper column reads threonine in 19% of them, a small-molecule inhibitor cross-reactivity map in one number.',
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
]

export const tutorialBySlug = new Map(tutorials.map(t => [t.slug, t]))
