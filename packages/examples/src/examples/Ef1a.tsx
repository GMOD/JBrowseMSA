import { MSAViewer } from 'react-msaview'

import { ef1aDomainsGFF, ef1aMSA, ef1aTree } from './generatedData'

// Translation elongation factor EF-1-alpha / EF-Tu across the three domains of
// life — bacteria (EF-Tu), archaea and eukaryotes (EF-1-alpha) in one
// alignment. This universal GTPase is conserved enough to probe the deepest
// splits in the tree of life; here the eukaryotes and bacteria each form a
// clean clade and the archaea fall near the root (labels prefixed
// Euk_/Arc_/Bac_) — the EF-Tu/EF-G duplication that Iwabe et al. 1989, PNAS
// (https://doi.org/10.1073/pnas.86.23.9355) used to root the universal tree.
// Built by scripts/examples-gen (UniProt + ClustalW). The InterProScan overlay
// shows the conserved three-domain EF architecture — the N-terminal GTP-binding
// (G) domain plus the two β-barrel domains — across all three kingdoms.
export default function Ef1a() {
  return (
    <MSAViewer
      msa={ef1aMSA}
      tree={ef1aTree}
      gff={ef1aDomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={420}
    />
  )
}
