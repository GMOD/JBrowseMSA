import React from 'react'

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
} from '@mui/material'
import { observer } from 'mobx-react'

import type { MsaViewModel } from '../../model.ts'

const Toggles = observer(function ({ model }: { model: MsaViewModel }) {
  // the accessions the file has, not the ones the filter map happens to hold:
  // that map now carries only what the reader turned off, and before that it
  // accumulated every accession of every file opened in this view
  const { annotationTypes } = model
  const setAll = (shown: boolean) => {
    for (const accession of annotationTypes.keys()) {
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
      <Toggles model={model} />
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
          {[...annotationTypes.values()].map(
            ({ accession, name, description }) => (
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
            ),
          )}
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
