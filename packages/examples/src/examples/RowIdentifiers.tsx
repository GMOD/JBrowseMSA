import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { when } from 'mobx'
import { observer } from 'mobx-react'
import { MSAModelF, MSAView } from 'react-msaview'
import {
  accessionOfRowName,
  findStructures,
  identifiersOfRowName,
  networkLookups,
} from 'react-msaview-structure'
import { StructurePanel } from 'react-msaview-structure/panel'

import { p53MSA, p53Tree } from './data'
import { SideBySide, messageOf } from './structureDemo'
import useWidthSetter from './useWidthSetter'

import type { StructureSearch } from 'react-msaview-structure'

// five p53 rows, each named the way a different source names a protein
const names = {
  Human: 'NP_000537.3',
  Mouse: 'P53_MOUSE',
  Rat: 'sp|P10361|P53_RAT',
  Dog: 'Q29537',
  Cat: 'cat_sample',
}

function renamed(text: string) {
  return Object.entries(names).reduce(
    (out, [species, name]) => out.replaceAll(species, name),
    text,
  )
}

function nameKind(name: string) {
  if (accessionOfRowName(name)) {
    return 'UniProt accession'
  }
  const [first] = identifiersOfRowName(name)
  return first?.kind === 'xref'
    ? 'RefSeq protein'
    : first?.kind === 'entryName'
      ? 'UniProt entry name'
      : 'no id'
}

type Looked = Record<string, StructureSearch | { error: string } | undefined>

// A row's name decides how its structure is found. A UniProt accession, in a
// header or alone, is looked up directly. An entry name or a RefSeq id is
// resolved to an accession through UniProt first, and the result says which
// name it came from. A name that is none of these finds nothing, and says so,
// which is the row Foldseek's sequence search is for.
const RowIdentifiers = observer(function RowIdentifiers() {
  const [model] = useState(() =>
    MSAModelF().create({
      type: 'MsaView',
      height: 360,
      colorSchemeName: 'clustalx_protein_dynamic',
      data: { msa: renamed(p53MSA), tree: renamed(p53Tree) },
    }),
  )
  const ref = useWidthSetter(model)
  const [looked, setLooked] = useState<Looked>({})

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    void (async () => {
      await when(() => model.dataInitialized, { signal })
      const results = await Promise.all(
        Object.values(names).map(async name => {
          let result: Looked[string]
          try {
            result = await findStructures({
              rowName: name,
              rowSequence: model.rowSequence(name) ?? '',
              lookups: networkLookups(signal),
            })
          } catch (e) {
            result = { error: messageOf(e) }
          }
          if (!signal.aborted) {
            setLooked(prev => ({ ...prev, [name]: result }))
          }
          return result
        }),
      )
      if (!signal.aborted) {
        model.setResidueMappings(
          results.flatMap(found =>
            'candidates' in found && found.candidates[0]
              ? [found.candidates[0].mapping]
              : [],
          ),
        )
      }
    })().catch(() => {})
    return () => {
      controller.abort()
    }
  }, [model])

  const [shown, setShown] = useState<string>(names.Human)
  const current = looked[shown]
  const mapping =
    current && 'candidates' in current ? current.candidates[0] : undefined

  return (
    <Box>
      <Table size="small" sx={{ mb: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell>Row name</TableCell>
            <TableCell>Read as</TableCell>
            <TableCell>UniProt accession</TableCell>
            <TableCell>Structure</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.values(names).map(name => {
            const found = looked[name]
            return (
              <TableRow
                key={name}
                hover
                selected={name === shown}
                onClick={() => {
                  setShown(name)
                }}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ fontFamily: 'monospace' }}>{name}</TableCell>
                <TableCell>{nameKind(name)}</TableCell>
                <TableCell>
                  {found && 'candidates' in found
                    ? `${found.accession ?? '—'}${found.resolvedFrom ? ` (from ${found.resolvedFrom})` : ''}`
                    : found
                      ? '—'
                      : 'looking up…'}
                </TableCell>
                <TableCell>
                  {found === undefined
                    ? ''
                    : 'error' in found
                      ? found.error
                      : (found.candidates[0]?.label ?? found.problem ?? '')}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <SideBySide>
        <div ref={ref}>
          <MSAView model={model} />
        </div>
        {mapping ? (
          <StructurePanel
            model={model}
            structureId={mapping.mapping.structure.id}
            height={420}
          />
        ) : null}
      </SideBySide>
    </Box>
  )
})

export default RowIdentifiers
