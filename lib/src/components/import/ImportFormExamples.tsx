import React from 'react'

import { Link, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import { smallMSA, smallMSAOnly, smallTree } from './data/seq2.ts'
import { load } from './util.ts'

import type { MsaViewModel } from '../../model.ts'

function ListItem({
  onClick,
  model,
  children,
}: {
  onClick: () => void
  model: MsaViewModel
  children: React.ReactNode
}) {
  return (
    <li>
      <Link
        onClick={event => {
          model.setError(undefined)
          event.preventDefault()
          onClick()
        }}
        href="#"
      >
        <Typography display="inline">{children}</Typography>
      </Link>
    </li>
  )
}

const ImportFormExamples = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  function l2(uri1?: string, uri2?: string) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        await load(
          model,
          uri1
            ? {
                uri: uri1,
                locationType: 'UriLocation',
              }
            : undefined,
          uri2
            ? {
                uri: uri2,
                locationType: 'UriLocation',
              }
            : undefined,
        )
      } catch (e) {
        console.error(e)
        model.setError(e)
      }
    })()
  }
  return (
    <ul>
      <ListItem
        model={model}
        onClick={() => {
          l2(
            undefined,
            'https://jbrowse.org/genomes/newicktrees/sarscov2phylo.pub.ft.nh',
          )
        }}
      >
        230k COVID-19 samples (tree only)
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          model.setData({ msa: smallMSA, tree: smallTree })
        }}
      >
        Small protein MSA+tree
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          model.setData({ msa: smallMSAOnly })
        }}
      >
        Small MSA only
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          l2(
            'https://jbrowse.org/genomes/multiple_sequence_alignments/pfam-cov2.stock',
          )
        }}
      >
        PFAM SARS-CoV2 multi-stockholm
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          l2(
            'https://jbrowse.org/genomes/multiple_sequence_alignments/Lysine.stock',
          )
        }}
      >
        Lysine stockholm file
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          l2(
            'https://jbrowse.org/genomes/multiple_sequence_alignments/PF01601_full.txt',
          )
        }}
      >
        PF01601 stockholm file (SARS-CoV2 spike protein)
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          l2(
            'https://jbrowse.org/genomes/multiple_sequence_alignments/europe_covid.fa',
          )
        }}
      >
        Europe COVID full genomes (LR883044.1 and 199 other sequences)
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          l2(
            'https://jbrowse.org/genomes/multiple_sequence_alignments/rhv_test-only.aligned_with_mafft_auto.fa',
            'https://jbrowse.org/genomes/multiple_sequence_alignments/rhv_test-only.aligned_with_mafft_auto.nh',
          )
        }}
      >
        MAFFT+VeryFastTree(17.9k samples)
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          l2('https://jbrowse.org/demos/ttc39a.mfa')
        }}
      >
        Human BLAST results mfa
      </ListItem>
    </ul>
  )
})

export default ImportFormExamples
