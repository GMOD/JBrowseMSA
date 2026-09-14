import { MSAViewer } from 'react-msaview'

import { coronaFseMSA } from './data'

// The coronavirus frameshifting stimulation element (Rfam RF00507), an
// 18-sequence subset of the seed spanning the four genera. The ribosome reads
// through this element to translate ORF1b because the RNA folds into a
// pseudoknot: a pair that crosses stem 1 instead of nesting inside it. WUSS
// cannot write a crossing pair as a bracket, so the seed writes it as the
// letter pair A/a. The "Base pairs" arc track draws those pairs as arcs
// crossing the stem, while the bracket track above it shows two unrelated runs
// of letters. Built by scripts/examples-gen.
export default function CoronaFse() {
  return <MSAViewer msa={coronaFseMSA} colorScheme="nucleotide" height={450} />
}
