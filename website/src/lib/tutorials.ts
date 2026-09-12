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
      'Twelve UniProt accessions to an alignment, a tree and Pfam domains, in four commands outside the viewer. Ends on a link that shows which lineages lost a domain.',
  },
]

export const tutorialBySlug = new Map(tutorials.map(t => [t.slug, t]))
