import { MSAViewer } from 'react-msaview'

import { ef1aMSA, ef1aTree } from './generatedData'

// Translation elongation factor EF-1-alpha / EF-Tu across the three domains of
// life — bacteria (EF-Tu), archaea and eukaryotes (EF-1-alpha) in one
// alignment. This universal GTPase is conserved enough to probe the deepest
// splits in the tree of life; here the eukaryotes and bacteria each form a
// clean clade and the archaea fall near the root (labels prefixed
// Euk_/Arc_/Bac_). Built by scripts/examples-gen (UniProt + ClustalW).
export default function Ef1a() {
  return (
    <MSAViewer
      msa={ef1aMSA}
      tree={ef1aTree}
      colorScheme="clustalx_protein_dynamic"
      height={420}
    />
  )
}
