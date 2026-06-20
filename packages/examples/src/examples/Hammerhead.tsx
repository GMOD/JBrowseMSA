import { MSAViewer } from 'react-msaview'

import { hammerheadMSA } from './generatedData'

// Hammerhead ribozyme (Rfam RF00008), a 20-sequence subset of the seed
// alignment — a small self-cleaving catalytic RNA. Its Stockholm SS_cons
// renders as a secondary-structure track showing the catalytic three-way helix
// junction: stem I (parens) enclosing stems II and III (angle brackets), all
// colored by base-pairing over the alignment. A counterpoint to the tRNA
// example — a catalytic RNA rather than an adaptor. The neighbor-joining tree
// (#=GF NH) is inferred from the alignment by scripts/examples-gen.
export default function Hammerhead() {
  return <MSAViewer msa={hammerheadMSA} colorScheme="nucleotide" height={400} />
}
