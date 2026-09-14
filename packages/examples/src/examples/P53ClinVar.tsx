import { MSAViewer } from 'react-msaview'

import { p53DomainsGFF, p53MSA, p53Tree } from './data'
import clinvar from './p53ClinVar.json'

// Three measures of which part of p53 matters, from three sources, on the same
// columns.
//
// The conservation track is computed from the alignment below it and shows
// where the family has not changed. The domain boxes come from InterPro and
// name the parts. The red bars come from ClinVar and count, per residue, the
// missense variants classified as pathogenic, which no alignment contains. 94%
// of them fall inside the DNA-binding domain, and the smaller cluster around
// residue 337 is the tetramerization domain.
//
// The host passes the counts in precomputed. `row` puts them on the human
// sequence's residues, so they land on the right columns whatever the gaps do,
// and `max` sets which count draws full height. Data and provenance in
// p53ClinVar.json, built by scripts/examples-gen/clinvar.mjs.
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
