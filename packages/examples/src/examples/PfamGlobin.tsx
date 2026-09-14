import { MSAViewer } from 'react-msaview'

// A whole Pfam family, loaded from the InterPro API as it stands: PF00042
// (Globin), 20,705 sequences over 672 columns. The API serves the full
// alignment gzipped (3 MB on the wire, 20 MB of Stockholm) and the browser
// decompresses it, so nothing here is a prepared copy — this is the URL from
// the entry page.
//
// The number that matters for a viewer is not the file size but what it costs
// to look at: around three seconds from opening the page to the first painted
// column, then scrolling and zooming stay interactive, because the canvas
// draws the tiles on screen rather than the alignment.
//
// allowedGappyness=50 hides the columns that are at least half gaps, which here
// is 556 of the 672: a Pfam full alignment gives every insertion its own
// columns, and at this depth most insertions belong to one sequence. What is
// left is the 116 columns of the globin fold itself.
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
