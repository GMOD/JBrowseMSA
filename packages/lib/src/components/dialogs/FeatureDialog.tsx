import React from 'react'

import { Dialog } from '@jbrowse/core/ui'
import { Button, DialogContent } from '@mui/material'
import { observer } from 'mobx-react'

import { getPalette } from '../../ggplotPalettes.ts'

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

const Table = observer(function ({ model }: { model: MsaViewModel }) {
  const { tidyInterProAnnotationTypes, featureFilters } = model
  const values = [...tidyInterProAnnotationTypes.values()]
  const palette = getPalette(values.length - 1)
  return (
    <>
      <Toggles model={model} />
      <table>
        <thead>
          <tr>
            <td />
            <td>accession</td>
            <td>name</td>
            <td>description</td>
          </tr>
        </thead>
        <tbody>
          {values.map(({ accession, name, description }, idx) => (
            <tr key={accession}>
              <td>
                <input
                  type="checkbox"
                  checked={featureFilters.get(accession) ?? false}
                  onChange={() => {
                    model.setFilter(
                      accession,
                      !model.featureFilters.get(accession),
                    )
                  }}
                />
              </td>
              <td>{accession}</td>
              <td>{name}</td>
              <td>{description}</td>
              <td>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: palette[idx] || 'black',
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <Table model={model} />
      </DialogContent>
    </Dialog>
  )
})

export default FeatureTypeDialog
