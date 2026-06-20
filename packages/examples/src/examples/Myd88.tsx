import { MSAViewer } from 'react-msaview'

import { myd88MSA, myd88Tree } from './generatedData'

// MyD88 (a TLR/IL-1R signalling adaptor) across mammals, including three bats.
// `relativeTo="Human"` diffs every row against human, so identical residues
// render as "." and only the lineage-specific substitutions show as letters —
// the same reading aid used in comparative-immunology papers, here paired with
// the inferred phylogeny. Data built by scripts/examples-gen (UniProt+ClustalW).
export default function Myd88() {
  return (
    <MSAViewer
      msa={myd88MSA}
      tree={myd88Tree}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={500}
    />
  )
}
