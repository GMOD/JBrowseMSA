import { MSAViewer } from 'react-msaview'

import { opsinDomainsGFF, opsinMSA, opsinTree } from './generatedData'

// Visual pigments (opsins) across vertebrates. The inferred tree sorts them
// into the classic opsin classes — dim-light rhodopsins (RH1) in one clade, the
// cone opsins (RH2 green, SWS1 UV/violet/blue, LWS red/green) in others — a
// colour-vision gene-duplication history. Every opsin is a 7-transmembrane
// GPCR, shown by the real InterProScan domain overlay. Built by
// scripts/examples-gen (UniProt + ClustalW + react-msaview-cli interproscan).
export default function Opsins() {
  return (
    <MSAViewer
      msa={opsinMSA}
      tree={opsinTree}
      gff={opsinDomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={420}
    />
  )
}
