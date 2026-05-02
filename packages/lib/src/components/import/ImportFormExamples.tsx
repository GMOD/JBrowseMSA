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
        <Typography component="span">{children}</Typography>
      </Link>
    </li>
  )
}

const BASE = 'https://jbrowse.org/genomes/multiple_sequence_alignments'

const ImportFormExamples = observer(function ({
  model,
}: {
  model: MsaViewModel
}) {
  function loadUris({
    msa,
    tree,
    gff,
  }: {
    msa?: string
    tree?: string
    gff?: string
  }) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        await load(
          model,
          msa ? { uri: msa, locationType: 'UriLocation' } : undefined,
          tree ? { uri: tree, locationType: 'UriLocation' } : undefined,
          gff ? { uri: gff, locationType: 'UriLocation' } : undefined,
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
          loadUris({
            tree: 'https://jbrowse.org/genomes/newicktrees/sarscov2phylo.pub.ft.nh',
          })
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
          loadUris({ msa: `${BASE}/pfam-cov2.stock` })
        }}
      >
        PFAM SARS-CoV2 multi-stockholm
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          loadUris({
            msa: `${BASE}/pfam-cov2.stock`,
            gff: `${BASE}/pfam-cov2-domains.gff`,
          })
        }}
      >
        PFAM SARS-CoV2 multi-stockholm w/ domains loaded
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          loadUris({ msa: `${BASE}/Lysine.stock` })
        }}
      >
        Lysine stockholm file
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          loadUris({ msa: `${BASE}/PF01601_full.txt` })
        }}
      >
        PF01601 stockholm file (SARS-CoV2 spike protein)
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          loadUris({ msa: `${BASE}/europe_covid.fa` })
        }}
      >
        Europe COVID full genomes (LR883044.1 and 199 other sequences)
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          loadUris({
            msa: `${BASE}/rhv_test-only.aligned_with_mafft_auto.fa`,
            tree: `${BASE}/rhv_test-only.aligned_with_mafft_auto.nh`,
          })
        }}
      >
        MAFFT+VeryFastTree(17.9k samples)
      </ListItem>
      <ListItem
        model={model}
        onClick={() => {
          loadUris({ msa: 'https://jbrowse.org/demos/ttc39a.mfa' })
        }}
      >
        Human BLAST results mfa
      </ListItem>
    </ul>
  )
})

export default ImportFormExamples
