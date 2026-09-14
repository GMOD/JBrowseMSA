import { MSAViewer } from 'react-msaview'

import { nlrp1DomainsGFF, nlrp1MSA, nlrp1Tree } from './data'

// NLRP1 (an inflammasome sensor) across twelve vertebrates, a true ortholog set
// whose members differ in domain architecture.
//
// Every row carries the same core in the same order: NACHT, winged helix, HD2,
// then FIIND / UPA-FIIND / CARD. The N terminus varies: the PYD (pyrin)
// death-fold domain is present in the primates, dog and hedgehog and absent in
// the rodents, artiodactyls, horse and fish. Rodent Nlrp1 lacking the PYD that
// human NLRP1 carries is the well-documented case; Pfam annotates the wider
// pattern.
//
// The overlay is column-locked instead of drawn against each protein's own
// residue ruler, and this example shows why. The shared NACHT starts at residue
// 328 in human and residue 93 in hamster, and the six core domains sit up to
// 391 residues apart between rows, yet in alignment columns they all land
// within 2 columns of each other. The PYD sits at column 38 in exactly the five
// rows that have it, so the other seven show a gap there.
//
// Data built by scripts/examples-gen (UniProt + ClustalW); domains are
// InterPro's precomputed Pfam matches (react-msaview-cli interpro).
export default function Nlrp1() {
  return (
    <MSAViewer
      msa={nlrp1MSA}
      tree={nlrp1Tree}
      gff={nlrp1DomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={500}
    />
  )
}
