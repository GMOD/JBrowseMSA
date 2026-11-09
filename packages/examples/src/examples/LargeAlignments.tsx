import { useState } from 'react'

import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { MSAViewer } from 'react-msaview'

// Both files are fetched as published. The canvas draws only the tiles on
// screen, so scrolling and zooming stay interactive at this depth.
// allowedGappyness=50 hides the columns at least half the rows leave empty;
// drag the slider in the header to 100% to see the file as parsed.
const sources = {
  pfam: {
    label: 'Pfam PF00042 (Globin), full alignment',
    url: 'https://www.ebi.ac.uk/interpro/api/entry/pfam/PF00042/?annotation=alignment:full',
    caption:
      'The URL on the InterPro entry page: 20,705 sequences over 672 ' +
      'columns, served gzipped (3 MB on the wire, 20 MB of Stockholm) for ' +
      'the browser to decompress. The first column paints about four ' +
      'seconds after the page opens. A Pfam full alignment gives every ' +
      'insertion its own columns, and at this depth most insertions belong ' +
      'to one sequence, so hiding the half-gap columns removes 556 of the ' +
      '672 and leaves the 116 of the globin fold.',
  },
  a3m: {
    label: 'A3M that AlphaFold2 was given for hemoglobin beta',
    url: 'https://openfold.s3.amazonaws.com/pdb/1a3n_B/a3m/bfd_uniclust_hits.a3m',
    caption:
      'OpenProteinSet publishes the MSAs AlphaFold2 was run on, and this is ' +
      'the one for chain B of PDB 1A3N: 1,211 hits from a BFD/UniClust ' +
      'search. Four repeat an id already in the file, and rows are keyed by ' +
      'id, so 1,207 rows load. In A3M, uppercase is a match column and ' +
      'lowercase an insertion outside the profile. The parser widens every ' +
      'insertion slot to the longest insertion any row puts there, so the ' +
      "query's 146 match columns stay in register across 2,086 columns. " +
      'Hiding the half-gap columns leaves the 129 that half the hits agree on.',
  },
}

type Source = keyof typeof sources

function isSource(value: string): value is Source {
  return value in sources
}

export default function LargeAlignments() {
  const [source, setSource] = useState<Source>('pfam')
  const { url, caption } = sources[source]
  return (
    <div>
      <TextField
        select
        size="small"
        label="Alignment"
        value={source}
        onChange={event => {
          if (isSource(event.target.value)) {
            setSource(event.target.value)
          }
        }}
        sx={{ minWidth: 320 }}
      >
        {Object.entries(sources).map(([key, { label }]) => (
          <MenuItem key={key} value={key}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      <Typography variant="body2" sx={{ my: 1 }}>
        {caption}
      </Typography>
      <MSAViewer
        msaUrl={url}
        colorScheme="clustalx_protein_dynamic"
        drawTree={false}
        treeAreaWidth={130}
        allowedGappyness={50}
        colWidth={9}
        rowHeight={2}
        height={540}
      />
    </div>
  )
}
