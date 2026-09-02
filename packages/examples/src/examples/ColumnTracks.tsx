import { MSAViewer } from 'react-msaview'

import { proteinMSA, proteinTree } from './exampleData'

// The viewer computes nothing here. The host scores each residue of one row
// (Kyte-Doolittle hydropathy of the human sequence), and the columnTracks prop
// carries the numbers in; `row` places them on that sequence's residues, so
// alignment gaps fall out, and `max` sets the value drawn at full height.
const hydropathy: Record<string, number> = {
  I: 4.5,
  V: 4.2,
  L: 3.8,
  F: 2.8,
  C: 2.5,
  M: 1.9,
  A: 1.8,
  G: -0.4,
  T: -0.7,
  S: -0.8,
  W: -0.9,
  Y: -1.3,
  P: -1.6,
  H: -3.2,
  E: -3.5,
  Q: -3.5,
  D: -3.5,
  N: -3.5,
  K: -3.9,
  R: -4.5,
}

const human = 'UniProt/Swiss-Prot|P01589|IL2RA_HUMAN'
const residues = proteinMSA
  .split('\n')
  .filter(line => line.startsWith(human))
  .map(line => line.slice(human.length).trim().replaceAll('-', ''))
  .join('')

export default function ColumnTracks() {
  return (
    <MSAViewer
      msa={proteinMSA}
      tree={proteinTree}
      colorScheme="clustalx_protein_dynamic"
      height={420}
      columnTracks={[
        {
          id: 'hydropathy',
          name: 'Hydropathy (human)',
          kind: 'bar',
          values: residues.split('').map(aa => (hydropathy[aa] ?? 0) + 4.5),
          max: 9,
          color: '#6a51a3',
          row: human,
        },
      ]}
    />
  )
}
