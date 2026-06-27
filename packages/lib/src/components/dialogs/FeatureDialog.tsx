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
  const { featureFilters } = model
  return (
    <div>
      <Button
        onClick={() => {
          for (const key of featureFilters.keys()) {
            model.setFilter(key, true)
          }
        }}
      >
        Toggle all on
      </Button>

      <Button
        onClick={() => {
          for (const key of featureFilters.keys()) {
            model.setFilter(key, false)
          }
        }}
      >
        Toggle all off
      </Button>
    </div>
  )
})

const FeatureTable = observer(function ({ model }: { model: MsaViewModel }) {
  const { tidyInterProAnnotationTypes, tidyInterProAnnotations, fillPalette } =
    model
  const counts = new Map<string, number>()
  for (const annot of tidyInterProAnnotations) {
    counts.set(annot.accession, (counts.get(annot.accession) ?? 0) + 1)
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
          {[...tidyInterProAnnotationTypes.values()].map(
            ({ accession, name, description }) => (
              <TableRow key={accession}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={model.featureFilters.get(accession) ?? false}
                    onChange={() => {
                      model.setFilter(
                        accession,
                        !model.featureFilters.get(accession),
                      )
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      background: fillPalette[accession],
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
