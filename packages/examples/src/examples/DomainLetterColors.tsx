import { useState } from 'react'

import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { MSAViewer } from 'react-msaview'

import { p53DomainsGFF, p53MSA, p53Tree } from './data'

// A filled domain box covers the cells the color scheme colors, so the viewer
// hands those cells to one of the two. bgColor={false} gives them to the
// scheme: the letters take the residue colors, and each domain draws as a bar
// along the bottom of its row. The prop applies to the mounted model, so a
// click keeps the scroll position. The standalone app has the same switch under
// Settings -> Color letters instead of background of tiles.
export default function DomainLetterColors() {
  const [bgColor, setBgColor] = useState(false)
  return (
    <div>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={bgColor ? 'background' : 'letters'}
        onChange={(_, value) => {
          if (value) {
            setBgColor(value === 'background')
          }
        }}
        sx={{ mb: 1 }}
      >
        <ToggleButton value="background">Color the background</ToggleButton>
        <ToggleButton value="letters">Color the letters</ToggleButton>
      </ToggleButtonGroup>
      <MSAViewer
        msa={p53MSA}
        tree={p53Tree}
        gff={p53DomainsGFF}
        colorScheme="maeditor"
        bgColor={bgColor}
        height={460}
      />
    </div>
  )
}
