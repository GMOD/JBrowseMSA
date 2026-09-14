import { MSAViewer } from 'react-msaview'

import interface6m0j from './ace2Interface.json'
import { ace2MSA, ace2Tree } from './data'

import type { Highlight, ResidueMapping } from 'react-msaview'

// ACE2, the SARS-CoV / SARS-CoV-2 receptor, across mammals: reservoir and
// intermediate-host candidates (horseshoe bats, civet, pangolin) plus naturally
// resistant rodents. `relativeTo="Human"` collapses the highly conserved
// ~800-residue protein to dots, so the few divergent spike-contact positions
// that drive host susceptibility stand out, as in the comparative host-range
// analysis of Damas et al. 2020, PNAS
// (https://doi.org/10.1073/pnas.2010146117). Built by scripts/examples-gen. The
// example has no domain overlay: ACE2's peptidase domain covers most of the
// protein and would bury the twenty contact columns.
//
// The contact positions come from a structure: the 20 ACE2 residues with an
// atom within 4 A of the spike receptor-binding domain in PDB 6M0J, marked as
// highlights on the human row's residues and projected through each ortholog's
// gaps (scripts/examples-gen/ace2Interface.mjs). A dot in one of those columns
// means the species keeps the human residue.
const highlights = interface6m0j.highlights as Highlight[]
const residueMappings = interface6m0j.residueMappings as ResidueMapping[]

export default function Ace2() {
  return (
    <MSAViewer
      msa={ace2MSA}
      tree={ace2Tree}
      relativeTo="Human"
      colorScheme="clustalx_protein_dynamic"
      height={480}
      highlights={highlights.map((h, i) => ({
        ...h,
        color: 'rgba(214,39,40,0.35)',
        ...(i === 0 ? { label: 'spike contacts (6M0J)' } : {}),
      }))}
      residueMappings={residueMappings}
    />
  )
}
