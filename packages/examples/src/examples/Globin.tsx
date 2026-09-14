import { MSAViewer } from 'react-msaview'

import { globinMSA, globinTree } from './data'
import sickle from './hemoglobinSickle.json'

import type { ResidueMapping } from 'react-msaview'

// The globin family (hemoglobin alpha/beta, myoglobin, neuroglobin and
// cytoglobin) across a few vertebrates. The inferred tree groups sequences by
// globin type and not by species (alpha chains together, beta chains together,
// ...), the signature of gene duplication that Zuckerkandl & Pauling read in
// the globins to propose the molecular clock (Evolving Genes and Proteins,
// 1965). Data built by scripts/examples-gen.
//
// One position on the beta chain has three numbers. The sickle-cell
// substitution is p.Glu7Val in HGVS, which counts the initiator methionine
// UniProt keeps; it is E6V in the clinical literature and residue 6 of chain B
// in PDB 1A3N, both counting the mature chain after that methionine is cleaved.
// The row is the UniProt sequence, so the highlight is at residue 7, and a
// structure viewer asks the residueMappings layer (SIFTS, built by
// scripts/examples-gen/hemoglobin.mjs) for the 6:
// model.structureResidue('Human_beta', 7) is 1A3N B:6.
//
// The bar track is AlphaMissense: the mean predicted pathogenicity of the 19
// substitutions at each HBB residue, read from the CSV that AlphaFold's own API
// names. It is this example's control. The sickle variant scores 0.22, "likely
// benign": the prediction asks whether a substitution breaks the protein, and
// mutant hemoglobin still folds and carries oxygen. The disease comes from the
// polymerization that follows.
const residueMappings = sickle.residueMappings as ResidueMapping[]

export default function Globin() {
  return (
    <MSAViewer
      msa={globinMSA}
      tree={globinTree}
      colorScheme="clustalx_protein_dynamic"
      height={460}
      residueMappings={residueMappings}
      highlights={[
        {
          row: sickle.sickle.row,
          start: sickle.sickle.seqPos,
          end: sickle.sickle.seqPos,
          color: 'rgba(214,39,40,0.35)',
          label: sickle.sickle.label,
        },
      ]}
      columnTracks={[
        {
          id: 'alphamissense',
          name: sickle.alphaMissense.name,
          kind: 'bar',
          row: sickle.alphaMissense.row,
          values: sickle.alphaMissense.values,
          max: sickle.alphaMissense.max,
          color: '#8e44ad',
          height: 60,
        },
      ]}
    />
  )
}
