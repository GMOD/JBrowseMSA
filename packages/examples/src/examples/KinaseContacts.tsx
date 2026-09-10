import { MSAViewer } from 'react-msaview'

import { kinaseDomainsGFF, kinaseMSA, kinaseTree } from './exampleData'
import contacts from './kinaseContacts.json'

// The same Src-family kinases as the domain example, with the domain boxes and
// a contact map over them. The boxes say the family is SH3 + SH2 + kinase; the
// arcs say how those three pack, which is the mechanism: autoinhibited Src
// folds its C-terminal tail back so phospho-Tyr527 binds its own SH2 domain,
// and the kinase stays shut until that bond is broken. Four arcs land on 527
// from the SH2 domain — the clamp, drawn as what it is, a pair of positions.
//
// Contacts are C-beta pairs under 8 A in PDB 2SRC, mapped to UniProt numbering
// through SIFTS and filtered to pairs that join two different domains (data and
// provenance in kinaseContacts.json, built by scripts/examples-gen/contacts.mjs).
// They are placed on the SRC_HUMAN row, so the viewer projects them onto the
// alignment's columns and every other row keeps its own gaps.
const color = (pair: string) => {
  if (pair.includes('SH2') && pair.includes('tail')) {
    return '#e15759'
  }
  if (pair.includes('tail')) {
    return '#f28e2b'
  }
  return pair.includes('SH3') ? '#59a14f' : '#4e79a7'
}

export default function KinaseContacts() {
  return (
    <MSAViewer
      msa={kinaseMSA}
      tree={kinaseTree}
      gff={kinaseDomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={520}
      columnTracks={[
        {
          id: 'contacts',
          name: 'Domain contacts (2SRC)',
          kind: 'arc',
          arcs: contacts.contacts.map(({ start, end, pair }) => ({
            start,
            end,
            color: color(pair),
          })),
          row: 'SRC_HUMAN',
          height: 60,
        },
      ]}
    />
  )
}
