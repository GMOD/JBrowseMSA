import { useState } from 'react'

import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { MSAViewer } from 'react-msaview'

import { p53DomainsGFF, p53MSA, p53Tree } from './data'
import clinvar from './p53ClinVar.json'
import predictors from './p53Predictors.json'

// Two models predict what each of the 7,467 possible p53 substitutions does,
// and a screen measured it. ESM-2 is a protein language model trained to fill
// in masked residues of UniRef sequences; it saw no variant labels, and its
// score is how much less likely it finds the substitute than the wild type.
// AlphaMissense adapts AlphaFold and is trained to tell the substitutions
// common in human and primate populations from the rest. The Giacomelli 2018
// screen grew A549 cells carrying each variant beside a wild-type copy under
// nutlin-3, so a variant that enriches has disabled p53.
//
// Each track is the mean over the substitutions at a residue of the human row,
// and `row` places it through that row's gaps. Each track's
// `encoding.y.scale.domainMax` is its largest value, rounded up. The red marks
// are the residues where the two models rank most differently.
//
// The tetramerization domain is the control: both models score it above their
// median, and the screen scores it below zero, because with a wild-type copy
// present a variant enriches only if it acts against the wild-type protein,
// and a variant that breaks tetramerization stops binding it.
//
// The scores, the correlations and the marks come from
// scripts/examples-gen/p53Predictors.py, which runs ESM-2 on the CPU and
// fetches the other sources.
const { row, means, spearman, variants, disagreements } = predictors

const tracks = [
  {
    id: 'screen',
    name: 'Screen (Giacomelli 2018)',
    values: means.screen.map(v => Math.max(0, v)),
    color: '#2e7d32',
  },
  {
    id: 'esm2',
    name: 'ESM-2, no labels',
    values: means.esm2,
    color: '#6a3d9a',
  },
  {
    id: 'alphamissense',
    name: 'AlphaMissense',
    values: means.alphamissense,
    color: '#1565c0',
  },
  {
    id: 'clinvar',
    name: 'ClinVar pathogenic',
    values: clinvar.counts,
    color: '#c0392b',
  },
]

const marks = disagreements.map(({ residue, letter, higher }) => ({
  row,
  start: residue,
  end: residue,
  label: `${letter}${residue}: ${higher} higher`,
  color: 'rgba(214,39,40,0.5)',
}))

export default function P53Predictors() {
  const [showMarks, setShowMarks] = useState(true)
  return (
    <div>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Spearman correlation with the screen over the {variants} substitutions
        all three score: ESM-2 {spearman.perVariant.esm2.toFixed(2)} per variant
        and {spearman.perResidue.esm2.toFixed(2)} per residue, AlphaMissense{' '}
        {spearman.perVariant.alphamissense.toFixed(2)} and{' '}
        {spearman.perResidue.alphamissense.toFixed(2)}. The two models correlate{' '}
        {spearman.modelsPerVariant.toFixed(2)} with each other.
      </Typography>
      <FormControlLabel
        label="Mark the residues where the models disagree most"
        control={
          <Switch
            checked={showMarks}
            onChange={event => {
              setShowMarks(event.target.checked)
            }}
          />
        }
      />
      <MSAViewer
        msa={p53MSA}
        tree={p53Tree}
        gff={p53DomainsGFF}
        colorScheme="clustalx_protein_dynamic"
        relativeTo={row}
        colWidth={3}
        height={680}
        highlights={showMarks ? marks : []}
        columnTracks={tracks.map(track => ({
          ...track,
          kind: 'bar',
          row,
          height: 50,
          encoding: {
            y: { scale: { domainMax: Math.ceil(Math.max(...track.values)) } },
          },
        }))}
      />
    </div>
  )
}
