import { MSAViewer } from 'react-msaview'

import { opsinDomainsGFF, opsinMSA, opsinTree } from './data'

// Visual pigments (opsins) across vertebrates. The inferred tree sorts them
// into the opsin classes, dim-light rhodopsins (RH1) in one clade and the cone
// opsins (RH2 green, SWS1 UV/violet/blue, LWS red/green) in others, following
// the gene duplications behind colour vision. Every opsin is a 7-transmembrane
// GPCR, which the InterProScan domain overlay marks. Yokoyama 2000, Prog.
// Retin. Eye Res. (https://pubmed.ncbi.nlm.nih.gov/10785616/) reviews the
// opsin-class history and spectral tuning. Built by scripts/examples-gen
// (UniProt + ClustalW + react-msaview-cli interpro).
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
