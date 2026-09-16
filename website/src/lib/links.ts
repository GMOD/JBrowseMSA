// The documentation and showcase pages. The header nav reads the label and the
// href, and the home page also prints the description.
const base = import.meta.env.BASE_URL

export interface SiteLink {
  label: string
  href: string
  body: string
}

export const docs: SiteLink[] = [
  {
    label: 'User guide',
    href: `${base}/guide`,
    body: 'Navigation, color schemes, tracks, exporting, and sharing a link to a view.',
  },
  {
    label: 'Tutorials',
    href: `${base}/tutorials`,
    body: 'Walkthroughs of the data preparation, from sequences to an alignment, a tree and annotations, each ending on a link that opens the result.',
  },
  {
    label: 'CLI',
    href: `${base}/cli`,
    body: 'react-msaview-cli builds domain and exon GFFs from InterPro, InterProScan or RefSeq, and exports an SVG with no browser.',
  },
  {
    label: 'Embedding',
    href: `${base}/embedding`,
    body: 'Props, the model API, and the UMD bundle.',
  },
  {
    label: 'Layers',
    href: `${base}/layers`,
    body: 'Highlights, data tracks and structure mappings you compute, carried in the snapshot for the viewer to draw.',
  },
  {
    label: 'R package',
    href: `${base}/r-package`,
    body: 'The msaviewr htmlwidget, with ape, Biostrings, ggtree, treeio and Shiny interop.',
  },
]

export const showcase: SiteLink[] = [
  {
    label: 'Gallery',
    href: `${base}/gallery`,
    body: 'Alignments that carry a finding, each one a link that opens it.',
  },
  {
    label: 'Examples',
    href: `${base}/examples`,
    body: 'Live usage patterns, with the source of each.',
  },
]
