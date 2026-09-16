// Every page the site routes to. The header nav reads the label and the href,
// and the home page prints the description beside them as its index.
//
// `app` and `tutorials` sit in the header bar itself rather than in the Docs
// menu: opening your own files and following a walkthrough are what someone
// arrives to do, and a menu hides both behind a click. Everything else is
// reference you go looking for once you are working, so it lives under Docs.
const base = import.meta.env.BASE_URL

export interface SiteLink {
  label: string
  href: string
  body: string
}

export const app: SiteLink = {
  label: 'Standalone app',
  href: `${base}/demo/`,
  body: 'Open your own files: a FASTA, Stockholm, Clustal, A3M or EMF alignment, a Newick tree, and GFF3 or InterProScan JSON annotations, from your computer or a URL.',
}

export const tutorials: SiteLink = {
  label: 'Tutorials',
  href: `${base}/tutorials`,
  body: 'Data preparation outside the viewer, from sequences to an alignment, a tree and annotations, each walkthrough ending on a link that opens the result. The index doubles as the gallery.',
}

export const docs: SiteLink[] = [
  {
    label: 'User guide',
    href: `${base}/guide`,
    body: 'Navigation, color schemes, tracks, exporting, and sharing a link to a view.',
  },
  {
    label: 'CLI',
    href: `${base}/cli`,
    body: 'react-msaview-cli builds domain and exon GFFs from InterPro, InterProScan or RefSeq, and exports an SVG with no browser.',
  },
  {
    label: 'Embedding',
    href: `${base}/embedding`,
    body: 'The React component: props, the model API, and the UMD script tag.',
  },
  {
    label: 'Examples',
    href: `${base}/examples`,
    body: 'The embedding guide as running code: one page per usage pattern, each rendering the viewer beside the source that produced it.',
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
  {
    label: 'Python package',
    href: `${base}/python-package`,
    body: 'The msaview-widget anywidget for JupyterLab, Notebook, VS Code and Colab, with Biopython, numpy and pandas interop.',
  },
]
