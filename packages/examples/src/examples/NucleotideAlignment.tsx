import { MSAViewer } from 'react-msaview'

import { nucleotideMSA } from './exampleData'

// A nucleotide alignment with no tree. Any of the DNA/RNA color schemes
// (nucleotide, rainbow_dna, jbrowse_dna, ...) can be passed.
export default function NucleotideAlignment() {
  return (
    <MSAViewer msa={nucleotideMSA} colorScheme="jbrowse_dna" height={300} />
  )
}
