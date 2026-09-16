import { MSAViewer } from 'react-msaview'

import { nlrp1DomainsGFF, nlrp1MSA, nlrp1Tree } from './exampleData'

// A separate module so Viewer.tsx can import() it dynamically. Vite splits it
// into a chunk that only desktop viewports fetch.
//
// The region opens on the start of the NACHT domain (column 371 here), which
// every row carries, so the first screen holds residues and a domain block
// instead of the ragged N-terminus.
export default function LiveViewer() {
  return (
    <MSAViewer
      msa={nlrp1MSA}
      tree={nlrp1Tree}
      gff={nlrp1DomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      treeAreaWidth={180}
      region={{ start: 360, end: 420 }}
      height={390}
    />
  )
}
