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
]

export const tutorialBySlug = new Map(tutorials.map(t => [t.slug, t]))
