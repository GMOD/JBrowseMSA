import Typography from '@mui/material/Typography'
import { MSAViewer } from 'react-msaview'

import { kinaseDomainsGFF, kinaseMSA, kinaseTree } from './data'
import structure from './kinaseStructure.json'

// Ten Src-family kinases with their InterPro domains, and residue contacts of
// autoinhibited human Src in PDB 2SRC. Two intramolecular bonds keep the kinase
// inactive. The C-terminal tail folds back so phospho-Tyr527 sits in the SH2
// domain's phosphotyrosine pocket, and the linker between SH2 and the kinase
// domain binds SH3. SH3 and SH2 rest against the back of the kinase domain.
//
// Contacts are C-beta pairs under 8 A in 2SRC, mapped to UniProt numbering
// through SIFTS. scripts/examples-gen/contacts.mjs keeps the pairs whose ends
// sit in two regions with a third between them in sequence (data and
// provenance in kinaseStructure.json). The arcs index the SRC_HUMAN row, so the
// viewer projects them onto the alignment's columns.
const groups = [
  {
    label: 'pTyr527 tail in the SH2 pocket',
    color: '#d62728',
    pairs: ['SH2 - C-terminal tail'],
  },
  {
    label: 'SH2-kinase linker on SH3',
    color: '#1f77b4',
    pairs: ['SH3 - SH2-kinase linker'],
  },
  {
    label: 'SH3 and SH2 against the kinase',
    color: '#2ca02c',
    pairs: ['SH3 - kinase', 'SH2 - kinase'],
  },
]
const other = { label: 'other contacts', color: '#c6c6c6' }

const groupOf = (pair: string) =>
  groups.find(g => g.pairs.includes(pair)) ?? other

const arcs = structure.contacts
  .map(({ start, end, pair }) => ({
    start,
    end,
    name: pair,
    color: groupOf(pair).color,
  }))
  .toSorted(
    (a, b) => Number(a.color !== other.color) - Number(b.color !== other.color),
  )

const legend = [...groups, other]

const rowLength = Math.max(...structure.residueMappings.map(m => m.rowLength))

const tail = structure.counts['SH2 - C-terminal tail']
const linker = structure.counts['SH3 - SH2-kinase linker']

const caption =
  `Two intramolecular bonds keep human Src inactive in PDB 2SRC. ` +
  `${tail} residue pairs join the C-terminal tail, around phospho-Tyr527, to ` +
  `the SH2 domain, and ${linker} join the SH2-kinase linker to the SH3 ` +
  `domain. Hover an arc for its two residues.`

export default function KinaseContacts() {
  return (
    <div>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {caption}
      </Typography>
      <MSAViewer
        msa={kinaseMSA}
        tree={kinaseTree}
        gff={kinaseDomainsGFF}
        residueColor={{ scale: { scheme: 'clustalx_protein_dynamic' } }}
        region={{ row: structure.row, start: 1, end: rowLength }}
        height={460}
        columnTracks={[
          {
            id: 'contacts',
            name: 'Contacts in 2SRC',
            kind: 'arc',
            arcs,
            row: structure.row,
            height: 90,
            encoding: {
              color: {
                scale: {
                  type: 'identity',
                  domain: legend.map(g => g.color),
                },
                legend: {
                  title: 'Contacts in 2SRC',
                  labels: legend.map(g => g.label),
                },
              },
            },
          },
        ]}
      />
    </div>
  )
}
