import { useMemo, useState } from 'react'

import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { MSAViewer } from 'react-msaview'

import { f12CdsMSA } from './data'
import { compareCodons, translate } from './geneticCode'

import type { Change, CodonComparison, Row } from './geneticCode'
import type { ColumnTrackSpec, Feature } from 'react-msaview'

// The example reads the F12 coding alignment as codons of the row the reader
// picks. It translates that row with the standard genetic code and compares
// the bases every other row has at the same three columns (geneticCode.ts).
// The viewer draws the result as four column tracks and one row feature per
// changed codon, which the featureFill encoding colors by its `change` field.
//
// Every track names the reference in `row`, so its data holds one character or
// number per base of the reference and the viewer places it through the gaps.
// The translation puts each amino acid over the middle base of its codon, and
// the codon track writes every tenth codon's number from its first base.
// `region` opens the view on codons 61 to 80, around the cetaceans' shared
// 1-bp deletion. Switching the reference swaps the features and the tracks
// on the same model, so the view keeps the reader's place.
const rows: Row[] = f12CdsMSA
  .split('\n')
  .filter(line => line && !line.startsWith('#') && !line.startsWith('//'))
  .map(line => {
    const [name = '', sequence = ''] = line.split(/\s+/)
    return { name, sequence }
  })

const changeColors: Record<Change, string> = {
  synonymous: '#56b4e9',
  'non-synonymous': '#e69f00',
  stop: '#000000',
  gapped: '#999999',
}

const codonStep = 10

const layers = {
  numbers: 'Codon numbers',
  translation: 'Translation',
  counts: 'Changes per codon',
  features: 'Changed codons in each row',
}
type Layer = keyof typeof layers
type TrackLayer = Exclude<Layer, 'features'>
const trackLayers: TrackLayer[] = ['numbers', 'translation', 'counts']

function codonTracks(
  codons: CodonComparison[],
  reference: string,
): Record<TrackLayer, ColumnTrackSpec[]> {
  const bases = 3 * codons.length
  const numbers = Array<string>(bases).fill(' ')
  const translation = Array<string>(bases).fill(' ')
  const synonymous = Array<number>(bases).fill(0)
  const nonSynonymous = Array<number>(bases).fill(0)
  for (const { number, aminoAcid, changes } of codons) {
    const first = 3 * (number - 1)
    translation[first + 1] = aminoAcid
    if (number % codonStep === 0) {
      const label = String(number).split('')
      numbers.splice(first, label.length, ...label)
    }
    const count = (change: Change) =>
      changes.filter(c => c.change === change).length
    synonymous.fill(count('synonymous'), first, first + 3)
    nonSynonymous.fill(count('non-synonymous'), first, first + 3)
  }
  const bar = {
    kind: 'bar' as const,
    max: rows.length - 1,
    height: 30,
    row: reference,
  }
  return {
    numbers: [
      {
        id: 'codon-number',
        name: 'Codon',
        kind: 'text',
        data: numbers.join(''),
        colors: {},
        row: reference,
      },
    ],
    translation: [
      {
        id: 'translation',
        name: `${reference} protein`,
        kind: 'text',
        data: translation.join(''),
        colors: { '*': changeColors.stop },
        row: reference,
      },
    ],
    counts: [
      {
        ...bar,
        id: 'synonymous',
        name: 'Synonymous',
        values: synonymous,
        color: changeColors.synonymous,
      },
      {
        ...bar,
        id: 'non-synonymous',
        name: 'Non-synonymous',
        values: nonSynonymous,
        color: changeColors['non-synonymous'],
      },
    ],
  }
}

// one feature per changed codon, in the row's own residue numbers
function changedCodons(codons: CodonComparison[]): Feature[] {
  return codons.flatMap(({ number, codon, aminoAcid, changes }) =>
    changes.map(({ row, change, codon: theirs, start, end }) => {
      const theirAminoAcid = translate(theirs)
      return {
        row,
        start,
        end,
        name: change,
        description: `codon ${number}: ${codon}>${theirs}${theirAminoAcid ? ` (${aminoAcid}>${theirAminoAcid})` : ''}`,
        change,
      }
    }),
  )
}

export default function CodonView() {
  const [reference, setReference] = useState('human')
  const [shown, setShown] = useState<Record<Layer, boolean>>({
    numbers: true,
    translation: true,
    counts: true,
    features: true,
  })
  const { tracks, features } = useMemo(() => {
    const codons = compareCodons(rows, reference)
    return {
      tracks: codonTracks(codons, reference),
      features: changedCodons(codons),
    }
  }, [reference])

  return (
    <div>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 1, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <TextField
          select
          size="small"
          label="Reference"
          value={reference}
          onChange={event => {
            setReference(event.target.value)
          }}
          sx={{ minWidth: 160 }}
        >
          {rows.map(({ name }) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        {Object.entries(layers).map(([layer, label]) => (
          <FormControlLabel
            key={layer}
            label={label}
            control={
              <Checkbox
                size="small"
                checked={shown[layer as Layer]}
                onChange={event => {
                  setShown({ ...shown, [layer]: event.target.checked })
                }}
              />
            }
          />
        ))}
      </Stack>
      <MSAViewer
        msa={f12CdsMSA}
        features={shown.features ? features : undefined}
        colorScheme="nucleotide"
        relativeTo={reference}
        region={{ row: 'human', start: 181, end: 240 }}
        height={510}
        columnTracks={trackLayers.flatMap(layer =>
          shown[layer] ? tracks[layer] : [],
        )}
        encodings={[
          {
            channel: 'featureFill',
            field: 'change',
            scale: { map: changeColors },
          },
        ]}
      />
    </div>
  )
}
