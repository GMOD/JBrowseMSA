import { MSAViewer } from 'react-msaview'

// A nucleotide alignment with no tree, loaded from a hosted FASTA so the source
// runs as-is when copied out. Any of the DNA/RNA color schemes (nucleotide,
// rainbow_dna, jbrowse_dna, ...) can be passed.
export default function NucleotideAlignment() {
  return (
    <MSAViewer
      msaFilehandle={{
        uri: 'https://gmod.org/JBrowseMSA/demo/data/nucleotide.fa',
        locationType: 'UriLocation',
      }}
      colorScheme="jbrowse_dna"
      height={300}
    />
  )
}
