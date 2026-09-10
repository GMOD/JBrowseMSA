import { MSAViewer } from 'react-msaview'

import { p53DomainsGFF, p53MSA, p53Tree } from './generatedData'
import clinvar from './p53ClinVar.json'

// Three answers to "which part of this protein matters", from three different
// places, stacked on the same columns.
//
// The conservation track is computed from the alignment below it: where this
// family has not changed. The domain boxes come from InterPro: what the parts
// are called. The red bars come from ClinVar and are the one thing the
// alignment cannot know — where changing the protein is known to cause disease.
// 94% of them fall inside the DNA-binding domain, and the smaller cluster
// around residue 337 is the tetramerization domain.
//
// The viewer computes none of it. `row` puts the counts on the human sequence's
// residues, so they land on the right columns whatever the gaps do, and `max`
// sets which count draws full height. Data and provenance in p53ClinVar.json,
// built by scripts/examples-gen/clinvar.mjs.
export default function P53ClinVar() {
  return (
    <MSAViewer
      msa={p53MSA}
      tree={p53Tree}
      gff={p53DomainsGFF}
      colorScheme="clustalx_protein_dynamic"
      relativeTo="Human"
      height={480}
      columnTracks={[
        {
          id: 'clinvar',
          name: 'ClinVar pathogenic',
          kind: 'bar',
          values: clinvar.counts,
          max: clinvar.max,
          color: '#c0392b',
          row: clinvar.row,
        },
      ]}
    />
  )
}
