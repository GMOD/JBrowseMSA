import { MSAViewer } from 'react-msaview'

import { insulinMSA, insulinTree } from './data'

// Insulin (preproinsulin) across vertebrates. The precursor is signal, B chain,
// C-peptide, A chain; the B and A chains fold into mature insulin and are
// tightly conserved, while the cleaved-out C-peptide drifts. With
// relativeTo="Human" the B and A regions render mostly as dots and the
// C-peptide region fills with letters. Built by scripts/examples-gen.
//
// The arcs are the three disulfide bonds from the UniProt P01308 feature table,
// placed on the human row's residues. Two of them span the whole C-peptide:
// B7-A7 and B19-A20 hold the mature hormone together after the peptide between
// them is cut out.
const disulfides = [
  { start: 31, end: 96 }, // B7-A7, interchain
  { start: 43, end: 109 }, // B19-A20, interchain
  { start: 95, end: 100 }, // A6-A11, within the A chain
]

export default function Insulin() {
  return (
    <MSAViewer
      msa={insulinMSA}
      tree={insulinTree}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={360}
      columnTracks={[
        {
          id: 'disulfides',
          name: 'Disulfide bonds',
          kind: 'arc',
          arcs: disulfides,
          color: '#b8860b',
          row: 'Human',
          height: 40,
        },
      ]}
    />
  )
}
