import { MSAViewer } from 'react-msaview'

import { aquaporinDomainsGFF, aquaporinMSA, aquaporinTree } from './data'

// The aquaporin (MIP) family of membrane channels. Every member shares the
// six-transmembrane MIP fold, which the InterProScan overlay marks, and the
// family splits by what it conducts: the water-only channels (AQP0/1/2/4/5) and
// the aquaglyceroporins (the "_glycerol" rows, AQP3/7/9) that also pass
// glycerol. The inferred tree recovers that functional split. Built by
// scripts/examples-gen (UniProt + ClustalW + react-msaview-cli interpro).
export default function Aquaporin() {
  return (
    <MSAViewer
      msa={aquaporinMSA}
      tree={aquaporinTree}
      gff={aquaporinDomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={380}
    />
  )
}
