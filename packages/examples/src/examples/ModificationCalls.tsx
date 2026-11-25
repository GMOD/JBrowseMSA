import { MSAViewer } from 'react-msaview'

import type { AlignmentMarkSpec, Feature } from 'react-msaview'

// Eight synthetic reads against a reference, each carrying a 5mC call at every
// CpG it reads. The cells keep their base colors and the reference-match wash,
// one mark fills each call's cell by its probability, and a second draws the
// exon on the reference as a bar under its row. The sequences and the calls
// are synthetic.
const reference =
  'TTGACGCGTACCGGATCGCGATTACGTGCAGCGTTACCGCGATGCAATCGACGTTGCATCGGCTACGTAGCAT'

const substitutions: Record<number, [number, string][]> = {
  1: [[14, 'A']],
  3: [
    [30, 'T'],
    [52, 'C'],
  ],
  5: [[44, 'G']],
  6: [[20, '-']],
}

const reads = Array.from({ length: 8 }, (_, r) =>
  (substitutions[r] ?? []).reduce(
    (seq, [i, base]) => seq.slice(0, i) + base + seq.slice(i + 1),
    reference,
  ),
)

const rows: [string, string][] = [
  ['reference', reference],
  ...reads.map((seq, r): [string, string] => [`read${r + 1}`, seq]),
]

const msa = rows.map(([name, seq]) => `>${name}\n${seq}`).join('\n')

// the 1-based residue of each CpG's C, and a probability that is high on the
// first half of the reference and low on the second
function calls(name: string, seq: string, r: number): Feature[] {
  const out: Feature[] = []
  let residue = 0
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] !== '-') {
      residue++
      if (seq[i] === 'C' && seq[i + 1] === 'G') {
        const spread = (i * 37 + r * 11) % 28
        out.push({
          row: name,
          start: residue,
          end: residue,
          type: 'modified_base',
          probability: i < seq.length / 2 ? 98 - spread : 2 + spread,
        })
      }
    }
  }
  return out
}

const features: Feature[] = [
  { row: 'reference', start: 9, end: 52, name: 'exon 2', type: 'exon' },
  ...reads.flatMap((seq, r) => calls(`read${r + 1}`, seq, r)),
]

const marks: AlignmentMarkSpec[] = [
  {
    kind: 'features',
    filter: [{ field: 'type', oneOf: ['modified_base'] }],
    height: { band: 1 },
    encoding: {
      fill: {
        field: 'probability',
        scale: {
          type: 'linear',
          domainMin: 0,
          domainMax: 100,
          range: ['#2c7bb6', '#d7191c'],
        },
        legend: { title: '5mC probability' },
      },
    },
  },
  {
    kind: 'features',
    filter: [{ field: 'type', oneOf: ['exon'] }],
    height: 3,
  },
]

export default function ModificationCalls() {
  return (
    <MSAViewer
      msa={msa}
      features={features}
      marks={marks}
      relativeTo="reference"
      residueColor={{ field: 'residue', scale: { scheme: 'jbrowse_dna' } }}
      colWidth={13}
      rowHeight={15}
      height={260}
    />
  )
}
