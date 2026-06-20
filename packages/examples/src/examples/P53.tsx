import { MSAViewer } from 'react-msaview'

import { p53MSA, p53Tree } from './generatedData'

// The tumor suppressor p53 (TP53) across mammals. Conservation is not uniform:
// the central DNA-binding domain (where most cancer mutations fall) is highly
// conserved while the N- and C-terminal regions vary. With relativeTo="Human"
// the middle of the alignment collapses to dots while the flanks stay full of
// letters — showing WHERE within a protein selection acts. Built by
// scripts/examples-gen (UniProt + ClustalW).
export default function P53() {
  return (
    <MSAViewer
      msa={p53MSA}
      tree={p53Tree}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={480}
    />
  )
}
