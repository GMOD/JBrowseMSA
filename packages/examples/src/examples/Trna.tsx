import { MSAViewer } from 'react-msaview'

import { trnaMSA } from './generatedData'

// Transfer RNA (Rfam RF00005), a 24-sequence subset of the seed alignment. The
// Stockholm file carries the canonical cloverleaf secondary structure
// (#=GC SS_cons), which the viewer surfaces as a dedicated "Secondary-structure"
// track above the alignment: the acceptor stem (parens) and the D-, anticodon-
// and T-arms (angle brackets) are colored by base-pairing, so the fold is
// visible at a glance against the columns. The neighbor-joining tree (#=GF NH)
// is inferred from the alignment by scripts/examples-gen.
export default function Trna() {
  return <MSAViewer msa={trnaMSA} colorScheme="nucleotide" height={450} />
}
