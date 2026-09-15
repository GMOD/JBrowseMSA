import '@nightingale-elements/nightingale-manager'
import '@nightingale-elements/nightingale-navigation'
import '@nightingale-elements/nightingale-sequence'

import { defineMsaElement } from 'react-msaview'

import { globinMSA, globinTree } from './data'

import type { DetailedHTMLProps, HTMLAttributes } from 'react'

// <jbrowse-msa> is the viewer as a custom element, and inside a
// <nightingale-manager> it registers with the manager like any Nightingale
// component. Brushing the navigation bar zooms the alignment to that stretch
// of human beta globin, hovering a residue in the alignment highlights it in
// the sequence track, and scrolling the alignment moves the navigation brush.
//
// reference-row names the row whose residues the manager's positions count.
// The alignment has gaps, so position 60 of Human_beta is not column 60; the
// element converts between the two in both directions.
defineMsaElement()

const reference = 'Human_beta'
// the alignment's columns start after the tree gutter and its 5px resize
// handle, so the Nightingale tracks take the same left margin
const treeAreaWidth = 300
const marginLeft = treeAreaWidth + 5
const sequence = /^>Human_beta\n([^>]+)/m
  .exec(globinMSA)![1]!
  .replaceAll(/[\s-]/g, '')

type CustomElement = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> &
  Record<string, unknown>

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'nightingale-manager': CustomElement
      'nightingale-navigation': CustomElement
      'nightingale-sequence': CustomElement
      'jbrowse-msa': CustomElement
    }
  }
}

export default function Nightingale() {
  return (
    <nightingale-manager reflected-attributes="display-start,display-end,highlight">
      <nightingale-navigation
        length={sequence.length}
        height={40}
        margin-left={marginLeft}
        margin-right={0}
        show-highlight
      />
      <nightingale-sequence
        length={sequence.length}
        sequence={sequence}
        height={30}
        margin-left={marginLeft}
        margin-right={0}
        highlight-event="onmouseover"
      />
      <jbrowse-msa
        msa={globinMSA}
        tree={globinTree}
        reference-row={reference}
        tree-area-width={treeAreaWidth}
        color-scheme="clustalx_protein_dynamic"
        height={420}
        hide-header
      />
    </nightingale-manager>
  )
}
