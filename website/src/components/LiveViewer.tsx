import { MSAViewer } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'

// A separate module so Viewer.tsx can import() it dynamically. Vite splits it
// into a chunk that only desktop viewports fetch.
export default function LiveViewer() {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6 }}>
      <MSAViewer
        msa={proteinMSA}
        tree={proteinTree}
        colorScheme="clustalx_protein_dynamic"
        height={400}
      />
    </div>
  )
}
