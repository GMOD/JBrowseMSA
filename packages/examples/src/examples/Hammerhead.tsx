import { MSAViewer } from 'react-msaview'

import { hammerheadMSA } from './data'

// Hammerhead ribozyme (Rfam RF00008), a small self-cleaving catalytic RNA, as a
// 20-sequence subset of the seed alignment. Its Stockholm SS_cons renders as a
// secondary-structure track showing the three-way helix junction: stem I
// (parens) enclosing stems II and III (angle brackets), colored by base-pairing
// over the alignment. scripts/examples-gen infers the neighbor-joining tree
// (#=GF NH) from the alignment.
export default function Hammerhead() {
  return <MSAViewer msa={hammerheadMSA} colorScheme="nucleotide" height={400} />
}
