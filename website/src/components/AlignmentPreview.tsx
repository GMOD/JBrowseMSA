import { MSAViewer } from 'react-msaview'

// The gene's 100-way alignment rendered right on the page with the same viewer
// the JBrowse plugin wraps. Its own module so GeneExplorer.tsx can lazy-load it:
// react-msaview is a large canvas + MUI bundle that only the preview needs.
export default function AlignmentPreview({
  msa,
  treeUri,
  height = 300,
}: {
  msa: string
  treeUri: string
  height?: number
}) {
  return (
    <MSAViewer
      msa={msa}
      treeFilehandle={{ uri: treeUri, locationType: 'UriLocation' }}
      colorScheme="percent_identity_dynamic"
      height={height}
      treeAreaWidth={200}
    />
  )
}
