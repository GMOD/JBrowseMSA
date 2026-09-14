import { MSAViewer } from 'react-msaview'

// A whole Pfam family loaded from the InterPro API: PF00042 (Globin), 20,705
// sequences over 672 columns. The API serves the full alignment gzipped (3 MB
// on the wire, 20 MB of Stockholm) and the browser decompresses it. The URL is
// the one on the entry page.
//
// The first column paints about three seconds after the page opens. After that,
// scrolling and zooming stay interactive because the canvas draws only the
// tiles on screen.
//
// allowedGappyness=50 hides the columns that are at least half gaps, 556 of the
// 672 here: a Pfam full alignment gives every insertion its own columns, and at
// this depth most insertions belong to one sequence. The remaining 116 columns
// are the globin fold.
const PFAM =
  'https://www.ebi.ac.uk/interpro/api/entry/pfam/PF00042/?annotation=alignment:full'

export default function PfamGlobin() {
  return (
    <MSAViewer
      msaFilehandle={{ uri: PFAM, locationType: 'UriLocation' }}
      colorScheme="clustalx_protein_dynamic"
      drawTree={false}
      treeAreaWidth={130}
      allowedGappyness={50}
      colWidth={9}
      rowHeight={2}
      height={560}
    />
  )
}
