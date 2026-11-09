import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'
import { StructurePanel } from 'react-msaview-structure/panel'

import { p53DomainsGFF, p53MSA, p53Tree } from './data'
import clinvar from './p53ClinVar.json'
import {
  MappingStatus,
  SideBySide,
  structureKey,
  useAccessionMappings,
} from './structureDemo'
import useWidthSetter from './useWidthSetter'

import type { StructureCandidate } from 'react-msaview-structure'

const proteins = [{ row: clinvar.row, accession: 'P04637' }]

// ClinVar counts the pathogenic missense variants at each p53 residue. The
// residues with at least five are marked red here, as a highlights layer on the
// human row. The alignment carries the marks across its columns and the
// structure carries them across its residues, so a hotspot is the same mark in
// both. The structure is mapped over the DNA-binding domain, where ClinVar has
// nearly all of them, so the view frames that domain and not the disordered
// tails around it.
const domain = { start: 94, end: 312 }

const hotspots = clinvar.counts.flatMap((count, i) =>
  count >= 5
    ? [
        {
          row: clinvar.row,
          start: i + 1,
          end: i + 1,
          label: count >= 6 ? String(i + 1) : undefined,
          color: 'rgba(192,57,43,0.9)',
        },
      ]
    : [],
)

// the mapping, limited to the residues of the domain
function clipToDomain(candidate: StructureCandidate): StructureCandidate {
  const segments = candidate.mapping.segments.flatMap(seg => {
    const start = Math.max(seg.rowStart, domain.start)
    const end = Math.min(seg.rowEnd, domain.end)
    return start > end
      ? []
      : [
          {
            rowStart: start,
            rowEnd: end,
            structStart: seg.structStart + (start - seg.rowStart),
            structEnd: seg.structStart + (end - seg.rowStart),
          },
        ]
  })
  return { ...candidate, mapping: { ...candidate.mapping, segments } }
}

const P53Hotspots3D = observer(function P53Hotspots3D() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 420,
      colorSchemeName: 'clustalx_protein_dynamic',
      relativeTo: clinvar.row,
      region: { row: clinvar.row, ...domain },
      data: { msa: p53MSA, tree: p53Tree, gff: p53DomainsGFF },
      highlights: hotspots,
    }),
  )
  const ref = useWidthSetter(model)
  const mappings = useAccessionMappings(model, proteins, {
    pick: candidates => {
      const first = candidates[0]
      return first && clipToDomain(first)
    },
  })
  const candidates = mappings.candidates[clinvar.row] ?? []
  const mapped = model.mappedStructures[0]?.structure
  const structureId = mapped?.id
  const shownKey = mapped && structureKey(mapped)

  function show(candidate: StructureCandidate) {
    model.setResidueMappings([clipToDomain(candidate).mapping])
  }

  return (
    <Box>
      <MappingStatus mappings={mappings} />
      {candidates.length > 1 ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
        >
          {candidates.slice(0, 5).map(candidate => {
            const key = structureKey(candidate.mapping.structure)
            return (
              <Button
                key={key}
                size="small"
                variant={key === shownKey ? 'contained' : 'outlined'}
                onClick={() => {
                  show(candidate)
                }}
              >
                {candidate.label}
              </Button>
            )
          })}
        </Stack>
      ) : null}
      <SideBySide>
        <div ref={ref}>
          <MSAView model={model} />
        </div>
        {structureId ? (
          <StructurePanel
            model={model}
            structureId={structureId}
            colorBy="none"
            height={460}
          />
        ) : null}
      </SideBySide>
    </Box>
  )
})

export default P53Hotspots3D
