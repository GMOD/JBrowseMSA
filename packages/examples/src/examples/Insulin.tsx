import { MSAViewer } from 'react-msaview'

import { insulinMSA, insulinTree } from './data'

import type { SpanSpec } from 'react-msaview'

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

// The precursor's parts from the same feature table. Processing cuts at the
// two basic pairs between them, RR 55-56 and KR 88-89.
const precursor = [
  { start: 1, end: 24, name: 'signal', part: 'signal peptide' },
  { start: 25, end: 54, name: 'B chain', part: 'insulin' },
  { start: 57, end: 87, name: 'C peptide', part: 'propeptide' },
  { start: 90, end: 110, name: 'A chain', part: 'insulin' },
]

// The helices and strands UniProt P01308 takes from PDB 3W7Y, a mature human
// insulin: B9-B19, B20-B22 and A2-A8, A13-A17 as helices and B24-B26 as a
// strand, drawn as an arrow.
const secondaryStructure: SpanSpec[] = [
  { start: 33, end: 43, type: 'helix' },
  { start: 44, end: 46, type: 'helix' },
  { start: 48, end: 50, type: 'strand', strand: '+' },
  { start: 91, end: 97, type: 'helix' },
  { start: 102, end: 106, type: 'helix' },
]

export default function Insulin() {
  return (
    <MSAViewer
      msa={insulinMSA}
      tree={insulinTree}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={400}
      columnTracks={[
        {
          id: 'precursor',
          name: 'Precursor',
          kind: 'features',
          features: precursor,
          encoding: {
            fill: {
              field: 'part',
              scale: {
                domain: ['signal peptide', 'insulin', 'propeptide'],
                range: ['#bbbbbb', '#4e79a7', '#f28e2b'],
              },
              legend: { title: 'Precursor' },
            },
            text: { field: 'name' },
          },
          row: 'Human',
        },
        {
          id: 'secondary-structure',
          name: 'Secondary structure',
          kind: 'features',
          features: secondaryStructure,
          encoding: {
            fill: {
              field: 'type',
              scale: {
                domain: ['helix', 'strand'],
                range: ['#e15759', '#edc948'],
              },
              legend: { title: 'Secondary structure' },
            },
          },
          row: 'Human',
        },
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
