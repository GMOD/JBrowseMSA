import { MSAViewer } from 'react-msaview'

import { coronaFseMSA } from './data'

// The coronavirus frameshifting stimulation element (Rfam RF00507), an
// 18-sequence subset of the seed spanning the four genera. The ribosome reads
// through this element to translate ORF1b, and it only does so because the RNA
// folds into a pseudoknot: a pair that crosses stem 1 rather than nesting
// inside it. WUSS cannot write a crossing pair as a bracket, so the seed writes
// it as the letter pair A/a -- and the "Base pairs" arc track is where that
// shows, as arcs crossing the stem instead of nesting under it. The bracket
// track above it draws the same annotation as characters, where a crossing
// looks like nothing at all. Built by scripts/examples-gen.
export default function CoronaFse() {
  return <MSAViewer msa={coronaFseMSA} colorScheme="nucleotide" height={450} />
}
