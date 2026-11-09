import { MSAViewer } from 'react-msaview'

const BASE = 'https://gmod.org/JBrowseMSA/demo/data'

// The MSAViewer component is the simplest entry point: give it the URL of an
// alignment, a Newick tree and an InterProScan GFF, and it fetches each file,
// creates the model, measures its width and applies the JBrowse theme. The
// files are hosted, so this example runs as-is wherever it is pasted. `msa`,
// `tree` and `gff` take the text directly when the page already has it.
export default function LoadFromUrl() {
  return (
    <MSAViewer
      msaUrl={`${BASE}/p53.aln`}
      treeUrl={`${BASE}/p53.nh`}
      gffUrl={`${BASE}/p53-domains.gff`}
      colorScheme="clustalx_protein_dynamic"
      height={500}
    />
  )
}
