import { MSAViewer } from 'react-msaview'

import { hoxDomainsGFF, hoxMSA, hoxTree } from './data'

// Hox transcription factors, the body-plan regulators. Across paralog groups
// (PG1 anterior to PG13 posterior) and clusters (A/B/C/D) these proteins
// diverge everywhere except the ~60-residue homeodomain, the DNA-binding
// helix-turn-helix they all share. Most of the alignment is gaps and mismatches
// around one conserved block, and the InterProScan overlay marks that
// homeodomain. Gehring et al. 1994, Annu. Rev. Biochem.
// (https://doi.org/10.1146/annurev.bi.63.070194.002415) described the
// homeodomain DNA-binding fold. Built by scripts/examples-gen (UniProt +
// ClustalW + react-msaview-cli interpro).
export default function Hox() {
  return (
    <MSAViewer
      msa={hoxMSA}
      tree={hoxTree}
      gff={hoxDomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={420}
    />
  )
}
