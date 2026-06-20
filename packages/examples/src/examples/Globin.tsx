import { MSAViewer } from 'react-msaview'

import { globinMSA, globinTree } from './generatedData'

// The globin family — hemoglobin alpha/beta, myoglobin, neuroglobin and
// cytoglobin across a few vertebrates. The inferred tree groups sequences by
// globin TYPE rather than by species (alpha chains together, beta chains
// together, ...), the classic signature of evolution by gene duplication that
// Zuckerkandl & Pauling read out of the globins to propose the molecular clock
// (Evolving Genes and Proteins, 1965).
// Data built by scripts/examples-gen (UniProt + ClustalW).
export default function Globin() {
  return (
    <MSAViewer
      msa={globinMSA}
      tree={globinTree}
      colorScheme="clustalx_protein_dynamic"
      height={420}
    />
  )
}
