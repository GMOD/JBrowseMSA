import { MSAViewer } from 'react-msaview'

import { p53DomainsGFF, p53MSA, p53Tree } from './generatedData'

// The tumor suppressor p53 (TP53) across mammals, with its InterProScan domains
// overlaid. The overlay maps the functional architecture onto the alignment:
// the central DNA-binding domain (where most cancer mutations fall) forms the
// bulk of the protein, flanked by the short N-terminal transactivation motifs
// and the C-terminal tetramerisation motif. The DNA-binding domain is the
// conserved "guardian of the genome" core of Lane 1992, Nature
// (https://doi.org/10.1038/358015a0). With relativeTo="Human" the unannotated
// linkers between the domains show the reference diff as dots. Built by
// scripts/examples-gen (UniProt + ClustalW).
export default function P53() {
  return (
    <MSAViewer
      msa={p53MSA}
      tree={p53Tree}
      gff={p53DomainsGFF}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={480}
    />
  )
}
