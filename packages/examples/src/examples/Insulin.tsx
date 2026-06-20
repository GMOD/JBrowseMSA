import { MSAViewer } from 'react-msaview'

import { insulinMSA, insulinTree } from './generatedData'

// Insulin (preproinsulin) across vertebrates. The precursor is signal - B chain
// - C-peptide - A chain; the B and A chains fold into mature insulin and are
// tightly conserved, while the cleaved-out C-peptide drifts. With
// relativeTo="Human" the B and A regions render mostly as dots while the
// C-peptide region fills with letters — conservation mapping onto which parts
// survive into the functional hormone. Built by scripts/examples-gen.
export default function Insulin() {
  return (
    <MSAViewer
      msa={insulinMSA}
      tree={insulinTree}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={320}
    />
  )
}
