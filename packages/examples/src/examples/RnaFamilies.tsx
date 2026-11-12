import { useState } from 'react'

import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { MSAViewer } from 'react-msaview'

import { coronaFseMSA, hammerheadMSA, lysineMSA, trnaMSA } from './data'

// Each file is a Stockholm subset of an Rfam seed. The parser reads the tree
// from its #=GF NH line, and the viewer draws #=GC SS_cons as a
// secondary-structure track above the alignment, colored by base-pairing.
// scripts/examples-gen builds the files and infers the trees the Rfam seeds
// leave out.
const families = {
  trna: {
    label: 'tRNA (RF00005): cloverleaf',
    msa: trnaMSA,
    height: 450,
    caption:
      'Transfer RNA, 24 sequences. The SS_cons track shows the cloverleaf: ' +
      'the acceptor stem in parentheses and the D, anticodon and T arms in ' +
      'angle brackets.',
  },
  hammerhead: {
    label: 'Hammerhead ribozyme (RF00008): three-way junction',
    msa: hammerheadMSA,
    height: 400,
    caption:
      'A small self-cleaving catalytic RNA, 20 sequences. Stem I, in ' +
      'parentheses, encloses stems II and III, in angle brackets, at a ' +
      'three-way helix junction.',
  },
  coronaFse: {
    label: 'Coronavirus frameshift element (RF00507): pseudoknot',
    msa: coronaFseMSA,
    height: 450,
    caption:
      'Eighteen sequences across the four coronavirus genera. The ribosome ' +
      'reads through this element to translate ORF1b because the RNA folds ' +
      'into a pseudoknot, a pair that crosses stem 1. WUSS writes a crossing ' +
      'pair as the letter pair A/a, so the bracket track shows two separate ' +
      'runs of letters, and the "Base pairs" arc track draws them as arcs ' +
      'crossing the stem.',
  },
  lysine: {
    label: 'Lysine riboswitch (RF00168): the tree in the file',
    msa: lysineMSA,
    height: 500,
    caption:
      'Sixty rows of the Rfam seed, whose Stockholm header carries the ' +
      'Rfam tree. The viewer draws that tree with no Newick file and no ' +
      'tree inference.',
  },
}

type FamilyId = keyof typeof families

function isFamily(value: string): value is FamilyId {
  return value in families
}

export default function RnaFamilies() {
  const [id, setId] = useState<FamilyId>('trna')
  const { msa, height, caption } = families[id]
  return (
    <div>
      <TextField
        select
        size="small"
        label="Family"
        value={id}
        onChange={event => {
          if (isFamily(event.target.value)) {
            setId(event.target.value)
          }
        }}
        sx={{ minWidth: 320 }}
      >
        {Object.entries(families).map(([key, { label }]) => (
          <MenuItem key={key} value={key}>
            {label}
          </MenuItem>
        ))}
      </TextField>
      <Typography variant="body2" sx={{ my: 1 }}>
        {caption}
      </Typography>
      <MSAViewer
        msa={msa}
        residueColor={{ scale: { scheme: 'nucleotide' } }}
        height={height}
      />
    </div>
  )
}
