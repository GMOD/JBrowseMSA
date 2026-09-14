import { MSAViewer } from 'react-msaview'

import { cytochromeCMSA, cytochromeCTree } from './data'

// Cytochrome c, the classic molecular-clock protein, across eukaryotes:
// mammals, reptile, fish, insect, plant and fungus in one short (~105-residue)
// alignment. The inferred tree spans well over a billion years, a much deeper
// scale than the within-family examples. Fitch & Margoliash 1967, Science
// (https://www.science.org/doi/10.1126/science.155.3760.279) used this protein
// to found molecular phylogenetics. Built by scripts/examples-gen (UniProt +
// ClustalW).
export default function CytochromeC() {
  return (
    <MSAViewer
      msa={cytochromeCMSA}
      tree={cytochromeCTree}
      colorScheme="clustalx_protein_dynamic"
      height={320}
    />
  )
}
