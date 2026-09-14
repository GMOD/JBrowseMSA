import { useState } from 'react'

import { MSAViewer } from 'react-msaview'

// Nextstrain aligns sequences to the reference and drops insertions relative to
// it, so each tip's sequence is the reference with that tip's mutations
// applied, and the gap-free MSA needs no aligner. That reconstruction pre-built
// these files (tree pruned to the same tips), hosted on jbrowse.org/demos.
// MSAViewer fetches them directly, and the tree and alignment stay row-linked:
// collapsing a clade also collapses its rows in the alignment.
const PATHOGENS = [
  { slug: 'covid', label: 'SARS-CoV-2' },
  { slug: 'zika', label: 'Zika' },
  { slug: 'ebola', label: 'Ebola' },
  { slug: 'measles', label: 'Measles' },
  { slug: 'rsv-a', label: 'RSV-A' },
]

export default function Nextstrain() {
  const [slug, setSlug] = useState('zika')
  const base = `https://jbrowse.org/demos/nextstrain/${slug}`
  return (
    <div>
      <label>
        Pathogen{' '}
        <select
          value={slug}
          onChange={event => {
            setSlug(event.target.value)
          }}
        >
          {PATHOGENS.map(p => (
            <option key={p.slug} value={p.slug}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <MSAViewer
        key={slug}
        treeFilehandle={{
          uri: `${base}/${slug}.nwk`,
          locationType: 'UriLocation',
        }}
        msaFilehandle={{
          uri: `${base}/${slug}_msa.fasta`,
          locationType: 'UriLocation',
        }}
        colorScheme="nucleotide"
        treeAreaWidth={300}
        height={600}
      />
    </div>
  )
}
