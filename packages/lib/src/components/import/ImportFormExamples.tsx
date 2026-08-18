import React from 'react'

import { Link, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import { smallMSA, smallMSAOnly, smallTree } from './data/seq2.ts'
import { load } from './util.ts'

import type { MsaViewModel } from '../../model.ts'

const BASE = 'https://jbrowse.org/genomes/multiple_sequence_alignments'
const TREES = 'https://jbrowse.org/genomes/newicktrees'

// each example either points at remote files (msa/tree/gff urls) or carries its
// data inline, which is what the two bundled small ones do
interface Example {
  label: string
  msa?: string
  tree?: string
  gff?: string
  inline?: { msa: string; tree?: string }
}

const examples: Example[] = [
  {
    label: '230k COVID-19 samples (tree only)',
    tree: `${TREES}/sarscov2phylo.pub.ft.nh`,
  },
  {
    label: 'Small protein MSA+tree',
    inline: { msa: smallMSA, tree: smallTree },
  },
  {
    label: 'Small MSA only',
    inline: { msa: smallMSAOnly },
  },
  {
    label: 'PFAM SARS-CoV2 multi-stockholm',
    msa: `${BASE}/pfam-cov2.stock`,
  },
  {
    label: 'PFAM SARS-CoV2 multi-stockholm w/ domains loaded',
    msa: `${BASE}/pfam-cov2.stock`,
    gff: `${BASE}/pfam-cov2-domains.gff`,
  },
  {
    label: 'Lysine stockholm file',
    msa: `${BASE}/Lysine.stock`,
  },
  {
    label: 'PF01601 stockholm file (SARS-CoV2 spike protein)',
    msa: `${BASE}/PF01601_full.txt`,
  },
  {
    label: 'Europe COVID full genomes (LR883044.1 and 199 other sequences)',
    msa: `${BASE}/europe_covid.fa`,
  },
  {
    label: 'MAFFT+VeryFastTree(17.9k samples)',
    msa: `${BASE}/rhv_test-only.aligned_with_mafft_auto.fa`,
    tree: `${BASE}/rhv_test-only.aligned_with_mafft_auto.nh`,
  },
  {
    label: 'Human BLAST results mfa',
    msa: 'https://jbrowse.org/demos/ttc39a.mfa',
  },
]

function uri(url?: string) {
  return url ? { uri: url, locationType: 'UriLocation' as const } : undefined
}

const ImportFormExamples = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  return (
    <ul>
      {examples.map(({ label, msa, tree, gff, inline }) => (
        <li key={label}>
          <Link
            href="#"
            onClick={event => {
              event.preventDefault()
              model.setError(undefined)
              try {
                if (inline) {
                  model.setData(inline)
                } else {
                  load(model, uri(msa), uri(tree), uri(gff))
                }
              } catch (e) {
                console.error(e)
                model.setError(e)
              }
            }}
          >
            <Typography component="span">{label}</Typography>
          </Link>
        </li>
      ))}
    </ul>
  )
})

export default ImportFormExamples
