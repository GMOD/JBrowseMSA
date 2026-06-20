import { MSAViewer } from 'react-msaview'

import { prestinDomainsGFF, prestinMSA, prestinTree } from './generatedData'

// Prestin (SLC26A5), the outer-hair-cell motor protein. Echolocating bats and
// toothed whales independently evolved many of the same prestin substitutions
// for high-frequency hearing — a famous case of molecular convergence. In this
// inferred tree the echolocators (a horseshoe bat + the toothed whales, labelled
// "_echo") cluster together rather than with their true relatives, so the gene
// tree is pulled away from the species tree by convergent selection — the result
// of Li, Liu, Shi & Zhang 2010, Curr. Biol.
// (https://www.cell.com/current-biology/fulltext/S0960-9822(09)02057-0).
// Built by scripts/examples-gen (UniProt + ClustalW). The InterProScan overlay
// shows the SLC26/SulP transmembrane transporter domain plus the cytoplasmic
// STAS domain that defines the family.
export default function Prestin() {
  return (
    <MSAViewer
      msa={prestinMSA}
      tree={prestinTree}
      gff={prestinDomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={440}
    />
  )
}
