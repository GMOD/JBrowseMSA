import { MSAViewer } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'

// The heavy, canvas-based viewer. Kept in its own module so Viewer.tsx can
// dynamically import() it — Vite code-splits it into a chunk that is only
// fetched on desktop and never downloaded on mobile.
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
