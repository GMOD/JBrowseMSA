import { MSAViewer } from 'react-msaview'

import { nlrp1DomainsGFF, nlrp1MSA, nlrp1Tree } from './generatedData'

// NLRP1 (an inflammasome sensor) across twelve vertebrates — a true ortholog
// set whose members do not share the same domain architecture.
//
// Every row carries the same core in the same order: NACHT, winged helix, HD2,
// then FIIND / UPA-FIIND / CARD. What varies is the N terminus — the PYD
// (pyrin) death-fold domain is present in the primates, dog and hedgehog and
// absent in the rodents, artiodactyls, horse and fish. Rodent Nlrp1 lacking the
// PYD that human NLRP1 carries is the well-documented case; the wider pattern
// is as annotated by Pfam.
//
// This is the example for why the overlay has to be column-locked rather than
// drawn against each protein's own residue ruler. The shared NACHT starts at
// residue 328 in human and residue 93 in hamster — the same six core domains
// span up to 391 residues of disagreement between rows — yet in alignment
// columns they all land within 2 columns of each other. The PYD sits at column
// 38 in exactly the five rows that have it, so the gap under it in the other
// seven is the missing module itself.
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
