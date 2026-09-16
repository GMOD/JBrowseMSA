import { useState } from 'react'

import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { MSAViewer } from 'react-msaview'

import { p53DomainsGFF, p53MSA, p53Tree } from './data'

import type { ResidueEncoding } from 'react-msaview'

// colorScheme is the scale over residue letters, and residueEncoding is the
// channel it paints. On `fill` it colors the cell, which is also where a domain
// box draws, so the overlay wins the row and the residue colors go. On `color`
// it colors the letter, and each domain gives up its fill for a bar along the
// bottom of its row. The prop applies to the mounted model, so a click keeps
// the scroll position. The standalone app has the same switch under
// Settings -> Color letters instead of background of tiles.
export default function DomainLetterColors() {
  const [encoding, setEncoding] = useState<ResidueEncoding>('color')
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
        colorScheme="maeditor"
        residueEncoding={encoding}
        height={460}
      />
    </div>
  )
}
