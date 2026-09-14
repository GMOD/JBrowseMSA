import { MSAViewer } from 'react-msaview'

import { lysineMSA } from './data'

// A real ~60-sequence ncRNA family (Rfam lysine riboswitch, RF00168) with its
// full inferred tree embedded in the Stockholm file (#=GF NH), which the parser
// extracts.
export default function LargeTree() {
  return <MSAViewer msa={lysineMSA} colorScheme="nucleotide" height={500} />
}
