import React from 'react'

import { Link, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import { smallMSA, smallTree } from './data/seq2.ts'
import { load } from './util.ts'

import type { MsaViewModel } from '../../model.ts'

const BASE = 'https://jbrowse.org/genomes/multiple_sequence_alignments'
const TREES = 'https://jbrowse.org/genomes/newick_trees'
const DEMO = 'https://gmod.org/JBrowseMSA/demo/data'

// each example points at remote files (msa/tree/gff urls) or carries its data
// inline
interface Example {
  label: string
  msa?: string
  tree?: string
  gff?: string
  inline?: { msa: string; tree?: string }
}

const examples: Example[] = [
  {
    label: 'NLRP1 in 12 mammals, with Pfam domains',
    msa: `${DEMO}/nlrp1.aln`,
    tree: `${DEMO}/nlrp1.nh`,
    gff: `${DEMO}/nlrp1-domains.gff`,
  },
  {
    label: '474 human protein kinase domains, with a FastTree tree',
    msa: `${DEMO}/kinase-pocket/kinase-pocket.afa`,
    tree: `${DEMO}/kinase-pocket/kinase-pocket.nwk`,
  },
  {
    label: 'RSV-A G gene in 1,840 genomes, with the Nextstrain tree',
    msa: `${DEMO}/scale/rsv-full.aln`,
    tree: `${DEMO}/scale/rsv-full.nh`,
  },
  {
    label: '230k COVID-19 samples (tree only)',
    tree: `${TREES}/sarscov2phylo.pub.ft.nh`,
  },
  {
    label: 'Pfam SARS-CoV-2 families, multi-Stockholm with domains',
    msa: `${BASE}/pfam-cov2.stock`,
    gff: `${BASE}/pfam-cov2-domains.gff`,
  },
  {
    label: 'Small protein alignment and tree',
    inline: { msa: smallMSA, tree: smallTree },
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
