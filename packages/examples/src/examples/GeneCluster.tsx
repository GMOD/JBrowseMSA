import { MSAViewer } from 'react-msaview'

import { geneClusterGFF, geneClusterMSA } from './data'

// Gene arrow map (gggenes-style) over an alignment. Each gene is one color down
// the columns, and the +/- strand draws as a left/right arrowhead. The overlay
// anchors to alignment columns, where gggenes facets use each genome's own
// coordinates, so genB deleted in Genome_5 and genC/genE inverted in others
// still line up down their columns. The data is synthetic; see
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
