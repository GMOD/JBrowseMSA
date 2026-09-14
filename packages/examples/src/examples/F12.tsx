import { MSAViewer } from 'react-msaview'

import { f12CdsMSA, f12ExonsGFF } from './data'

// Coagulation factor XII (F12) coding sequence across mammals, with its 14-exon
// gene structure overlaid the same way InterProScan protein domains are. Every
// species' Nth exon is named exon-N, so a given exon is the same color in every
// row.
//
// F12 is a DNA example because the loss shows only at the nucleotide level. The
// gene is intact in land mammals and in the manatee (a fully aquatic sirenian),
// but disabled in the four cetaceans (minke whale, dolphin, beluga, porpoise)
// by premature stop codons and a shared single-base frameshift in exon 3,
// visible as a one-column deletion shared by exactly the cetacean clade. F12 is
// one of the genes lost in the cetacean transition to fully aquatic life
// (Huelsmann et al. 2019, Sci. Adv.), and the intact manatee gene shows the
// loss tracks the cetacean lineage, not aquatic life in general.
//
// The note points at the frameshift in human coordinates and names the
// carriers, so the same list works in a shared URL.
//
// Built from the UCSC cactus 241-way alignment; see scripts/f12-cetacean. The
// tree is embedded in the Stockholm (#=GF NH).
export default function F12() {
  return (
    <MSAViewer
      msa={f12CdsMSA}
      gff={f12ExonsGFF}
      colorScheme="nucleotide"
      colWidth={3}
      highlights={[
        { row: 'human', start: 206, end: 206, label: 'shared 1-bp deletion' },
        {
          rows: ['minke_whale', 'dolphin', 'beluga', 'porpoise'],
          label: 'cetaceans: F12 lost',
        },
      ]}
      height={440}
    />
  )
}
