import { MSAViewer } from 'react-msaview'

import { f12CdsMSA, f12ExonsGFF } from './exampleData'

// Coagulation factor XII (F12) coding sequence across mammals, with its 14-exon
// gene structure overlaid the same way InterProScan protein domains are — here
// every species' Nth exon is named exon-N, so a given exon is the same color in
// every row and the exon architecture reads straight down the alignment.
//
// F12 is a DNA example because the story only exists at the nucleotide level:
// the gene is intact in land mammals and, notably, in the manatee (a fully
// aquatic sirenian), but disabled in the four cetaceans (minke whale, dolphin,
// beluga, porpoise) by premature stop codons and a shared single-base frameshift
// in exon 3 — visible as a one-column deletion shared by exactly the cetacean
// clade of the tree. It is one of the genes lost in the cetacean transition to
// fully aquatic life (Huelsmann et al. 2019, Sci. Adv.), and the manatee shows
// the loss tracks the cetacean lineage, not aquatic life in general.
//
// Built reproducibly from the UCSC cactus 241-way alignment; see
// scripts/f12-cetacean. The tree is embedded in the Stockholm (#=GF NH).
export default function F12() {
  return (
    <MSAViewer
      msa={f12CdsMSA}
      gff={f12ExonsGFF}
      colorScheme="nucleotide"
      colWidth={3}
      highlightColumns={[205]}
      height={440}
    />
  )
}
