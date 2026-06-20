import { MSAViewer } from 'react-msaview'

import { ace2DomainsGFF, ace2MSA, ace2Tree } from './generatedData'

// ACE2, the SARS-CoV / SARS-CoV-2 receptor, across mammals — reservoir and
// intermediate-host candidates (horseshoe bats, civet, pangolin) plus naturally
// resistant rodents. `relativeTo="Human"` collapses the highly conserved ~800-
// residue protein to dots, so the handful of divergent spike-contact positions
// that drive host susceptibility stand out — the comparative host-range analysis
// of Damas et al. 2020, PNAS (https://doi.org/10.1073/pnas.2010146117).
// Built by scripts/examples-gen. The InterProScan overlay shows the catalytic
// peptidase M2 domain and the C-terminal collectrin domain.
export default function Ace2() {
  return (
    <MSAViewer
      msa={ace2MSA}
      tree={ace2Tree}
      gff={ace2DomainsGFF}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={480}
    />
  )
}
