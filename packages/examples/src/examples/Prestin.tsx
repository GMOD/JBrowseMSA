import { MSAViewer } from 'react-msaview'

import { prestinMSA, prestinTree } from './generatedData'

// Prestin (SLC26A5), the outer-hair-cell motor protein. Echolocating bats and
// toothed whales independently evolved many of the same prestin substitutions
// for high-frequency hearing — a famous case of molecular convergence. In this
// inferred tree the echolocators (a horseshoe bat + the toothed whales, labelled
// "_echo") cluster together rather than with their true relatives, so the gene
// tree is pulled away from the species tree by convergent selection. Built by
// scripts/examples-gen (UniProt + ClustalW).
export default function Prestin() {
  return (
    <MSAViewer
      msa={prestinMSA}
      tree={prestinTree}
      colorScheme="clustalx_protein_dynamic"
      height={440}
    />
  )
}
