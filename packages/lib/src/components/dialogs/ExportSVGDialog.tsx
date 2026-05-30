import React, { useState } from 'react'

import { Dialog, ErrorMessage } from '@jbrowse/core/ui'
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
  useTheme,
} from '@mui/material'

import Checkbox2 from '../Checkbox2.tsx'

import type { MsaViewModel } from '../../model.ts'

export default function ExportSVGDialog({
  model,
  onClose,
}: {
  model: MsaViewModel
  onClose: () => void
}) {
  const [includeMinimap, setIncludeMinimap] = useState(true)
  const [includeTracks, setIncludeTracks] = useState(true)
  const [exportType, setExportType] = useState<'entire' | 'viewport'>('viewport')
  const [error, setError] = useState<unknown>()
  const theme = useTheme()
  const {
    totalWidth,
    totalHeight,
    treeAreaWidth,
    turnedOnTracks,
    totalTrackAreaHeight,
  } = model
  const hasTracks = turnedOnTracks.length > 0
  const entireWidth = totalWidth + treeAreaWidth
  const entireHeight = totalHeight + (includeTracks ? totalTrackAreaHeight : 0)
  const isLargeExport =
    exportType === 'entire' && (entireWidth > 10000 || entireHeight > 10000)
  return (
    <Dialog
      onClose={() => {
        onClose()
      }}
      open
      title="Export SVG"
    >
      <DialogContent>
        {error ? <ErrorMessage error={error} /> : null}
        <Typography>Settings:</Typography>
        <Checkbox2
          label="Include minimap?"
          disabled={exportType === 'entire'}
          checked={includeMinimap}
          onChange={() => {
            setIncludeMinimap(!includeMinimap)
          }}
        />
        {hasTracks ? (
          <Checkbox2
            label="Include tracks?"
            checked={includeTracks}
            onChange={() => {
              setIncludeTracks(!includeTracks)
            }}
          />
        ) : null}
        <div>
          <FormControl>
            <FormLabel>Export type</FormLabel>
            <RadioGroup
              value={exportType}
              onChange={event => {
                const { value } = event.target
                if (value === 'entire' || value === 'viewport') {
                  setExportType(value)
                }
              }}
            >
              <FormControlLabel
                value="entire"
                control={<Radio />}
                label="Entire MSA"
              />
              <FormControlLabel
                value="viewport"
                control={<Radio />}
                label="Current viewport only"
              />
            </RadioGroup>
          </FormControl>
        </div>
        {isLargeExport ? (
          <Alert severity="warning" style={{ marginTop: 8 }}>
            The entire MSA is very large ({Math.round(entireWidth)}x
            {Math.round(entireHeight)} pixels). Export may be slow or fail.
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            void model
              .exportSVG({
                theme,
                includeMinimap: exportType === 'entire' ? false : includeMinimap,
                includeTracks: hasTracks && includeTracks,
                exportType,
              })
              .then(() => {
                onClose()
              })
              .catch((e: unknown) => {
                console.error(e)
                setError(e)
              })
          }}
        >
          Submit
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            onClose()
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
