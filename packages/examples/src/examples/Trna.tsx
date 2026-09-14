import { MSAViewer } from 'react-msaview'

import { trnaMSA } from './data'

// Transfer RNA (Rfam RF00005), a 24-sequence subset of the seed alignment. The
// Stockholm file carries the cloverleaf secondary structure (#=GC SS_cons),
// which the viewer draws as a "Secondary-structure" track above the alignment,
// coloring the acceptor stem (parens) and the D-, anticodon- and T-arms (angle
// brackets) by base-pairing. scripts/examples-gen infers the neighbor-joining
// tree (#=GF NH) from the alignment.
export default function Trna() {
  return <MSAViewer msa={trnaMSA} colorScheme="nucleotide" height={450} />
}
