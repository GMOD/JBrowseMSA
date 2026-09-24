import React, { useState } from 'react'

import { Dialog } from '@jbrowse/core/ui'
import {
  Button,
  Checkbox,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'
import type { Annotation } from '../../types.ts'

function matches(type: Annotation, query: string) {
  return [type.accession, type.name, type.description].some(field =>
    field?.toLowerCase().includes(query),
  )
}

const Toggles = observer(function ({
  model,
  accessions,
}: {
  model: MsaViewModel
  accessions: string[]
}) {
  const setAll = (shown: boolean) => {
    for (const accession of accessions) {
      model.setFilter(accession, shown)
    }
  }
  return (
    <div>
      <Button
        onClick={() => {
          setAll(true)
        }}
      >
        Toggle all on
      </Button>

      <Button
        onClick={() => {
          setAll(false)
        }}
      >
        Toggle all off
      </Button>
    </div>
  )
})

const FeatureTable = observer(function ({ model }: { model: MsaViewModel }) {
  const { annotationTypes, annotations, featureColors, fillPalette } = model
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const types = [...annotationTypes.values()].filter(
    type => !needle || matches(type, needle),
  )
  const counts = new Map<string, number>()
  const swatches = new Map<string, string>()
  for (const annot of annotations) {
    const { accession } = annot
    counts.set(accession, (counts.get(accession) ?? 0) + 1)
    if (!swatches.has(accession)) {
      swatches.set(
        accession,
        featureColors.get(annot)?.fill ?? fillPalette[accession]!,
      )
    }
  }
  return (
    <>
      <TextField
        label="Filter"
        size="small"
        value={query}
        onChange={event => {
          setQuery(event.target.value)
        }}
      />
      <Toggles model={model} accessions={types.map(t => t.accession)} />
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" />
            <TableCell>color</TableCell>
            <TableCell>accession</TableCell>
            <TableCell>name</TableCell>
            <TableCell>count</TableCell>
            <TableCell>description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {types.map(({ accession, name, description }) => (
            <TableRow key={accession}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={!model.turnedOffFeatures.get(accession)}
                  onChange={() => {
                    model.setFilter(
                      accession,
                      !!model.turnedOffFeatures.get(accession),
                    )
                  }}
                />
              </TableCell>
              <TableCell>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: swatches.get(accession),
                  }}
                />
              </TableCell>
              <TableCell>{accession}</TableCell>
              <TableCell>{name}</TableCell>
              <TableCell>{counts.get(accession)}</TableCell>
              <TableCell>{description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
})

const FeatureTypeDialog = observer(function ({
  onClose,
  model,
}: {
  onClose: () => void
  model: MsaViewModel
}) {
  return (
    <Dialog
      onClose={() => {
        onClose()
      }}
      open
      title="Feature filters"
      maxWidth="xl"
    >
      <DialogContent>
        <FeatureTable model={model} />
      </DialogContent>
    </Dialog>
  )
})

export default FeatureTypeDialog
