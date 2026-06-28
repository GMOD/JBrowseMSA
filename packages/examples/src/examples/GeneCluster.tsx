import { MSAViewer } from 'react-msaview'

import { geneClusterGFF, geneClusterMSA } from './exampleData'

// Gene arrow map (gggenes-style) rendered over a real alignment. Each gene is
// one color down the columns; the +/- strand draws as a left/right arrowhead.
// Because the overlay is anchored to alignment columns (not each genome's own
// coordinate, the way gggenes facets are), homology is exact: genB is deleted in
// Genome_5 and genC/genE are inverted in others, yet every gene still lines up
// straight down its column. Synthetic illustrative data — see
// scripts/gene-cluster/generate.mjs.
export default function GeneCluster() {
  return (
    <MSAViewer
      msa={geneClusterMSA}
      gff={geneClusterGFF}
      colorScheme="nucleotide"
      colWidth={1}
      rowHeight={44}
      height={360}
    />
  )
}
