import { MSAViewer } from 'react-msaview'

import { p53DomainsGFF, p53MSA, p53Tree } from './generatedData'

// The tumor suppressor p53 (TP53) across mammals. Conservation is not uniform:
// the central DNA-binding domain (where most cancer mutations fall) is highly
// conserved while the N- and C-terminal regions vary. With relativeTo="Human"
// the middle of the alignment collapses to dots while the flanks stay full of
// letters — showing WHERE within a protein selection acts. The conserved core is
// the "guardian of the genome" DNA-binding domain of Lane 1992, Nature
// (https://doi.org/10.1038/358015a0).
// Built by scripts/examples-gen (UniProt + ClustalW). The InterProScan overlay
// lines its domains up with the conservation pattern: the transactivation
// domain, the central DNA-binding domain (the conserved core) and the
// C-terminal tetramerization domain.
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
