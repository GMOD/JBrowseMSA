import { MSAViewer } from 'react-msaview'

import { histoneH4MSA, histoneH4Tree } from './generatedData'

// Histone H4 across eukaryotes (human → chicken → fly → worm → plant → yeast →
// ciliate). H4 is among the most conserved proteins known: with
// relativeTo="Human" nearly the entire ~103-residue alignment renders as dots,
// and only the few substitutions in the most distant lineages show as letters —
// the extreme-conservation end of the spectrum. Built by scripts/examples-gen.
export default function HistoneH4() {
  return (
    <MSAViewer
      msa={histoneH4MSA}
      tree={histoneH4Tree}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={320}
    />
  )
}
