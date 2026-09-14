import { MSAViewer } from 'react-msaview'

import { kinaseDomainsGFF, kinaseMSA, kinaseTree } from './data'
import structure from './kinaseStructure.json'

import type { ResidueMapping } from 'react-msaview'

// The same Src-family kinases as the domain example, with the domain boxes and
// a contact map over them. The boxes mark the SH3, SH2 and kinase domains, and
// the arcs mark how those three pack. Autoinhibited Src folds its C-terminal
// tail back so phospho-Tyr527 binds its own SH2 domain, and the kinase stays
// shut until that bond breaks. Four arcs from the SH2 domain land on 527.
//
// Contacts are C-beta pairs under 8 A in PDB 2SRC, mapped to UniProt numbering
// through SIFTS and filtered to pairs that join two different domains (data and
// provenance in kinaseStructure.json, built by
// scripts/examples-gen/contacts.mjs). They are placed on the SRC_HUMAN row, so
// the viewer projects them onto the alignment's columns and every other row
// keeps its own gaps.
//
// The same file carries the SIFTS correspondence behind the arcs as a
// `residueMappings` layer. This page has no structure viewer to use it, but a
// host with one can call model.structureResidue('SRC_HUMAN', 527) and get 2SRC
// residue 443 back.
//
// A JSON import widens every literal to `string` and every pair to `number[]`,
// so the cast types it. The script that writes the file verifies its numbering.
const residueMappings = structure.residueMappings as ResidueMapping[]

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
      residueMappings={residueMappings}
      columnTracks={[
        {
          id: 'contacts',
          name: 'Domain contacts (2SRC)',
          kind: 'arc',
          arcs: structure.contacts.map(({ start, end, pair }) => ({
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
