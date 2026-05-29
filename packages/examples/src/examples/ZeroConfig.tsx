import { MSAViewer } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'

// The MSAViewer component is the simplest entry point: pass alignment and tree
// text as strings and it creates the model, measures width, and applies the
// JBrowse theme for you.
export default function ZeroConfig() {
  return (
    <MSAViewer
      msa={proteinMSA}
      tree={proteinTree}
      colorScheme="maeditor"
      height={550}
    />
  )
}
