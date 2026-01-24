import React from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { DialogContent, Link, Typography } from '@mui/material'

import { version } from '../../version.ts'

export default function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      open
      title="About"
      onClose={() => {
        onClose()
      }}
    >
      <DialogContent>
        <Typography>
          MSAView {version} (
          <Link href="https://github.com/gmod/react-msaview">Github</Link>)
        </Typography>

        <ul>
          <li>
            <Typography>
              We use some color schemes from the{' '}
              <Link href="https://github.com/biotite-dev/biotite">biotite</Link>{' '}
              project, and their license is reproduced{' '}
              <Link href="https://github.com/biotite-dev/biotite/blob/master/LICENSE.rst">
                here
              </Link>
            </Typography>
          </li>
          <li>
            <Typography>
              See this page for some information on jalview colorings{' '}
              <Link href="https://www.jalview.org/help/html/colourSchemes/">
                here
              </Link>
            </Typography>
          </li>
          <li>
            <Typography>
              See this page for some info on the clustal, cinema, maeditor, and
              lesk color schemes{' '}
              <Link href="http://www.bioinformatics.nl/~berndb/aacolour.html">
                here
              </Link>
            </Typography>
          </li>
          <li>
            <Typography>
              See this paper about the flower color scheme{' '}
              <Link href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7245768/">
                here
              </Link>
            </Typography>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
