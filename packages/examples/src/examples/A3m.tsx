import { MSAViewer } from 'react-msaview'

// The alignment a structure predictor sees. OpenProteinSet publishes the MSAs
// AlphaFold2 was run on, and this is the one for chain B of PDB 1A3N —
// hemoglobin beta, the chain the sickle-cell example highlights: 1,211 hits
// from a BFD/UniClust search, in A3M. Four of them repeat an id already in the
// file, and rows are keyed by id, so 1,207 rows land in the viewer.
//
// A3M is aligned FASTA with a convention: uppercase is a match column,
// lowercase is an insertion that does not belong to the profile, '.' is padding
// where some other row inserted. Rows are therefore ragged, and 1,186 of these
// carry at least one insertion. The parser expands them into a rectangle —
// every insertion slot widened to the longest insertion any row puts there — so
// the query's 146 match columns stay in register down the whole file, and the
// 2,086 columns they end up spread across are what the insertions cost.
//
// allowedGappyness=50 is how that cost is undone for reading: hiding the
// columns at least half the rows leave empty brings the 129 columns half these
// hits agree on back together. Drag the slider in the header to 100% to see the
// file as it is parsed.
const A3M =
  'https://openfold.s3.amazonaws.com/pdb/1a3n_B/a3m/bfd_uniclust_hits.a3m'

export default function A3m() {
  return (
    <MSAViewer
      msaFilehandle={{ uri: A3M, locationType: 'UriLocation' }}
      colorScheme="clustalx_protein_dynamic"
      allowedGappyness={50}
      colWidth={9}
      rowHeight={2}
      height={520}
    />
  )
}
