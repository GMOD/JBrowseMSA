import { MSAViewer } from 'react-msaview'

import { myd88DomainsGFF, myd88MSA, myd88Tree } from './generatedData'

// MyD88 (a TLR/IL-1R signalling adaptor) across mammals, including three bats.
// The InterProScan overlay shows its two-domain architecture — an N-terminal
// Death domain and a C-terminal TIR domain — on every row.
// `relativeTo="Human"` diffs every row against human, so identical residues
// render as "." and only the lineage-specific substitutions show as letters —
// the same reading aid used in comparative-immunology papers, here paired with
// the inferred phylogeny. Fruit-bat MyD88 changes that dampen TLR signalling are
// a focus of Tian et al. 2023, Sci. Adv.
// (https://pmc.ncbi.nlm.nih.gov/articles/PMC10162675/).
// Data built by scripts/examples-gen (UniProt+ClustalW).
export default function Myd88() {
  return (
    <MSAViewer
      msa={myd88MSA}
      tree={myd88Tree}
      gff={myd88DomainsGFF}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={500}
    />
  )
}
