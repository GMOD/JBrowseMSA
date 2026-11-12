import Typography from '@mui/material/Typography'
import { MSAViewer } from 'react-msaview'

import { kinaseDomainsGFF, kinaseMSA, kinaseTree } from './data'
import esm from './kinaseEsmContacts.json'

// ESM-2 is a protein language model trained to fill in masked residues of
// UniRef sequences. Its contact head reads the attention maps of one sequence
// and gives a probability that each pair of residues sits within 8 A. Here it
// reads human Src alone, with no alignment and no structure.
//
// The top track holds the residue pairs at least 6 apart that ESM-2 ranks
// highest, one per residue PDB 2SRC resolves (L of them), colored by
// probability. The bottom track holds every pair at least 6 apart whose
// C-beta atoms sit under 8 A in 2SRC, red where the pair is among those top
// predictions. Both tracks index the SRC_HUMAN row in UniProt numbering, and
// the viewer places them through that row's gaps.
//
// The predictions, the contacts and the precision figures come from
// scripts/examples-gen/kinaseEsmContacts.py, which runs ESM-2 on the CPU and
// reads 2SRC through scripts/examples-gen/contactMap.mjs.
const found = '#d62728'
const missed = '#c6c6c6'

const toArcs = (pairs: number[][], color?: string) =>
  pairs.flatMap(([start, end, value]) =>
    start === undefined || end === undefined
      ? []
      : [{ start, end, value, color }],
  )

const { precision, resolved, realContacts } = esm
const topFifth = precision['L/5']
const longRange = precision['longRangeL/5']

const caption =
  `Of the ${topFifth.top} residue pairs ESM-2 ranks most probable (the top ` +
  `L/5, with L = ${resolved} residues resolved in 2SRC), ` +
  `${topFifth.contacts} are contacts in 2SRC. So are ` +
  `${precision['L/2'].contacts} of the top ${precision['L/2'].top} and ` +
  `${precision.L.contacts} of the top ${precision.L.top}, and among pairs ` +
  `at least 24 residues apart, ${longRange.contacts} of the top ` +
  `${longRange.top}. 2SRC has ${realContacts} contacts between residues at ` +
  `least 6 apart, red where ESM-2 ranks the pair in its top ${resolved}.`

export default function KinaseEsmContacts() {
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
        colWidth={2}
        height={560}
        columnTracks={[
          {
            id: 'esm2',
            name: `ESM-2 top ${resolved} contacts`,
            kind: 'arc',
            arcs: toArcs(esm.predicted),
            row: esm.row,
            height: 90,
            encoding: {
              color: {
                scale: {
                  type: 'linear',
                  scheme: 'viridis',
                  reverse: true,
                  domainMax: 1,
                },
                legend: { title: 'ESM-2 contact probability' },
              },
            },
          },
          {
            id: 'contacts',
            name: 'Contacts in 2SRC',
            kind: 'arc',
            arcs: [...toArcs(esm.missed, missed), ...toArcs(esm.found, found)],
            row: esm.row,
            height: 90,
            encoding: {
              color: {
                scale: { type: 'identity', domain: [found, missed] },
                legend: {
                  title: '2SRC contacts',
                  labels: [`in ESM-2's top ${resolved}`, 'not predicted'],
                },
              },
            },
          },
        ]}
      />
    </div>
  )
}
