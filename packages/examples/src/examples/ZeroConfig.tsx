import { MSAViewer } from 'react-msaview'

const BASE = 'https://gmod.org/JBrowseMSA/demo/data'

// The MSAViewer component is the simplest entry point: point it at an alignment
// and a tree and it creates the model, measures width, and applies the JBrowse
// theme for you. Both files are hosted, so this example runs as-is wherever it
// is pasted; `msa` and `tree` take the text directly when you already have it.
export default function ZeroConfig() {
  return (
    <MSAViewer
      msaFilehandle={{ uri: `${BASE}/il2ra.aln`, locationType: 'UriLocation' }}
      treeFilehandle={{ uri: `${BASE}/il2ra.nh`, locationType: 'UriLocation' }}
      colorScheme="maeditor"
      height={550}
    />
  )
}
