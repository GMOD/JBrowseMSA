import { useState } from 'react'

import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { MSAViewer } from 'react-msaview'

import { p53DomainsGFF, p53MSA, p53Tree } from './data'
import clinvar from './p53ClinVar.json'

import type { ResidueEncoding } from 'react-msaview'

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
// and `encoding.y.scale.domainMax` sets which count draws full height. Data and provenance in
// p53ClinVar.json, built by scripts/examples-gen/clinvar.mjs.
//
// colorScheme is the scale over residue letters, and residueEncoding is the
// channel it paints. On `fill` it colors the cell, which is also where a domain
// box draws, so the box covers the residue colors. On `color` it colors the letter, and
// each domain draws as a bar along the bottom of its row. The standalone app
// has the same switch under Settings → Color, as "Color the letters, not the
// cells".
export default function P53ClinVar() {
  const [encoding, setEncoding] = useState<ResidueEncoding>('fill')
  return (
    <div>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={encoding}
        onChange={(_, value: ResidueEncoding | null) => {
          if (value) {
            setEncoding(value)
          }
        }}
        sx={{ mb: 1 }}
      >
        <ToggleButton value="fill">Color the background</ToggleButton>
        <ToggleButton value="color">Color the letters</ToggleButton>
      </ToggleButtonGroup>
      <MSAViewer
        msa={p53MSA}
        tree={p53Tree}
        gff={p53DomainsGFF}
        colorScheme="clustalx_protein_dynamic"
        relativeTo="Human"
        residueEncoding={encoding}
        height={480}
        columnTracks={[
          {
            id: 'clinvar',
            name: 'ClinVar pathogenic',
            kind: 'bar',
            values: clinvar.counts,
            encoding: { y: { scale: { domainMax: clinvar.max } } },
            color: '#c0392b',
            row: clinvar.row,
          },
        ]}
      />
    </div>
  )
}
