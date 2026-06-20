import { MSAViewer } from 'react-msaview'

import { lysineMSA } from './exampleData'

// A real ~60 sequence ncRNA family (Rfam Lysine riboswitch, RF00168) with its
// full inferred tree embedded in the Stockholm file (#=GF NH), auto-extracted
// by the parser. Shows the canvas tiling holds up well past toy-sized data.
export default function LargeTree() {
  return <MSAViewer msa={lysineMSA} colorScheme="nucleotide" height={500} />
}
