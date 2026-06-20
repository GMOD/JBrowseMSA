import { MSAViewer } from 'react-msaview'

import { ace2MSA, ace2Tree } from './generatedData'

// ACE2, the SARS-CoV / SARS-CoV-2 receptor, across mammals — reservoir and
// intermediate-host candidates (horseshoe bats, civet, pangolin) plus naturally
// resistant rodents. `relativeTo="Human"` collapses the highly conserved ~800-
// residue protein to dots, so the handful of divergent spike-contact positions
// that drive host susceptibility stand out. Built by scripts/examples-gen.
export default function Ace2() {
  return (
    <MSAViewer
      msa={ace2MSA}
      tree={ace2Tree}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={480}
    />
  )
}
