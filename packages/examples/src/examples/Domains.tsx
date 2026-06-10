import { MSAViewer } from 'react-msaview'

import { domainsGFF, domainsMSA } from './exampleData'

// Protein domain annotations — for example the GFF3 produced by
// `react-msaview-cli interproscan alignment.fasta -o domains.gff` — can be
// passed inline as the `gff` prop. Each protein_match is drawn as a labelled
// box over the matching rows, and the overlay turns on automatically.
export default function Domains() {
  return (
    <MSAViewer
      msa={domainsMSA}
      gff={domainsGFF}
      colorScheme="clustalx_protein_dynamic"
      height={400}
    />
  )
}
