import { MSAViewer } from 'react-msaview'

import { hoxDomainsGFF, hoxMSA, hoxTree } from './generatedData'

// Hox transcription factors — the body-plan master regulators. Across paralog
// groups (PG1 anterior to PG13 posterior) and clusters (A/B/C/D) these proteins
// are wildly divergent EXCEPT for the ~60-residue homeodomain, the DNA-binding
// helix-turn-helix they all share. Most of the alignment is gaps and mismatch
// while one block stays conserved; the InterProScan overlay marks exactly that
// homeodomain — a vivid "single conserved domain in a divergent protein" case,
// the counterpoint to multi-domain p53. The homeodomain DNA-binding fold was
// described by Gehring et al. 1994, Annu. Rev. Biochem.
// (https://doi.org/10.1146/annurev.bi.63.070194.002415). Built by
// scripts/examples-gen (UniProt + ClustalW + react-msaview-cli interpro).
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
