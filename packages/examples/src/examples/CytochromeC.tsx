import { MSAViewer } from 'react-msaview'

import { cytochromeCMSA, cytochromeCTree } from './generatedData'

// Cytochrome c — the classic molecular-clock protein — across the breadth of
// eukaryotic life: mammals, reptile, fish, insect, plant and fungus all in one
// short (~105-residue) alignment. The inferred tree therefore spans well over a
// billion years, a deliberately different scale from the within-family
// examples. Built by scripts/examples-gen (UniProt + ClustalW).
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
