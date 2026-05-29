import { MSAViewer } from 'react-msaview'

const BASE = 'https://jbrowse.org/genomes/multiple_sequence_alignments'

// Instead of inline strings, the viewer can fetch remote files. A Stockholm
// file can carry its own embedded tree, and an InterProScan GFF can be layered
// on top to draw protein domain annotations.
export default function LoadFromUrl() {
  return (
    <MSAViewer
      msaFilehandle={{
        uri: `${BASE}/pfam-cov2.stock`,
        locationType: 'UriLocation',
      }}
      gffFilehandle={{
        uri: `${BASE}/pfam-cov2-domains.gff`,
        locationType: 'UriLocation',
      }}
      colorScheme="maeditor"
      height={550}
    />
  )
}
