import { MSAViewer } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'

// Live, interactive viewer embedded as a client-only React island. Uses canvas
// + ResizeObserver, so it must render in the browser (client:only="react").
export default function Viewer() {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 6 }}>
      <MSAViewer
        msa={proteinMSA}
        tree={proteinTree}
        colorScheme="clustalx_protein_dynamic"
        height={400}
      />
    </div>
  )
}
