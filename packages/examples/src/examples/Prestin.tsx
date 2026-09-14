import { MSAViewer } from 'react-msaview'

import { prestinDomainsGFF, prestinMSA, prestinTree } from './data'

// Prestin (SLC26A5), the outer-hair-cell motor protein. Echolocating bats and
// toothed whales independently evolved many of the same prestin substitutions
// for high-frequency hearing. In this inferred tree the echolocators (a
// horseshoe bat and the toothed whales, labelled "_echo") cluster together
// instead of with their true relatives, so convergent selection pulls the gene
// tree away from the species tree, as Li, Liu, Shi & Zhang 2010, Curr. Biol.
// (https://www.cell.com/current-biology/fulltext/S0960-9822(09)02057-0)
// reported. Built by scripts/examples-gen (UniProt + ClustalW). The
// InterProScan overlay shows the SLC26/SulP transmembrane transporter domain
// plus the cytoplasmic STAS domain that defines the family.
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
