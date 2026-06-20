import { MSAViewer } from 'react-msaview'

import {
  aquaporinDomainsGFF,
  aquaporinMSA,
  aquaporinTree,
} from './generatedData'

// The aquaporin (MIP) family of membrane channels. Every member shares the same
// six-transmembrane MIP fold — shown by the InterProScan overlay — yet the
// family splits by what it conducts: the classical water-only channels
// (AQP0/1/2/4/5) versus the aquaglyceroporins (the "_glycerol" rows, AQP3/7/9)
// that also pass glycerol. The inferred tree recovers that functional split, so
// like the globins the family groups by what each protein does. A second
// membrane-channel example alongside the opsin GPCRs. Built by
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
