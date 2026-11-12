import React, { useState } from 'react'

import { Dialog, ErrorMessage } from '@jbrowse/core/ui'
import {
  Alert,
  Button,
  CircularProgress,
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
import { observer } from 'mobx-react'

import { exportPageSize, getLayout } from '../../exportLayout.ts'
import Checkbox2 from '../Checkbox2.tsx'

import type { ExportType } from '../../exportLayout.ts'
import type { MsaViewModel } from '../../model.ts'

// Run after the browser has painted. A requestAnimationFrame callback still
// runs *before* the frame it was queued for, so one alone hands the main thread
// to the render with the spinner not yet on screen; the second fires once that
// frame is out.
function afterPaint(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn)
  })
}

function isExportType(value: string): value is ExportType {
  return value === 'entire' || value === 'viewport' || value === 'selection'
}

const ExportSVGDialog = observer(function ({
  model,
  onClose,
}: {
  model: MsaViewModel
  onClose: () => void
}) {
  const [includeMinimap, setIncludeMinimap] = useState(true)
  const [includeTracks, setIncludeTracks] = useState(true)
  const [chosenType, setExportType] = useState<ExportType>('viewport')
  const [error, setError] = useState<unknown>()
  const [exporting, setExporting] = useState(false)
  const theme = useTheme()
  const { turnedOnTracks, showMsaLetters, resolvedSelection } = model
  const { colWidth, rowHeight } = model
  const hasTracks = turnedOnTracks.length > 0
  const exportType =
    chosenType === 'selection' && !resolvedSelection ? 'entire' : chosenType
  const layout = getLayout(model, { theme, exportType, includeTracks })
  const page = exportPageSize(model, layout)
  // the background is one raster image whatever its size, so what the figure
  // actually costs is its residue letters: each is an svg element of its own.
  // Past roughly this many the export runs to tens of seconds and can exhaust
  // the tab's memory outright
  const glyphs =
    showMsaLetters && exportType !== 'viewport'
      ? Math.round(layout.msaAreaWidth / colWidth) *
        Math.round(layout.contentHeight / rowHeight)
      : 0
  const isLargeExport = glyphs > 100_000
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
          disabled={exportType !== 'viewport'}
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
                if (isExportType(value)) {
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
              {resolvedSelection ? (
                <FormControlLabel
                  value="selection"
                  control={<Radio />}
                  label="Selection only"
                />
              ) : null}
            </RadioGroup>
          </FormControl>
        </div>
        {isLargeExport ? (
          <Alert severity="warning" style={{ marginTop: 8 }}>
            The {exportType === 'selection' ? 'selection' : 'entire MSA'} is{' '}
            {Math.round(page.width)}x{Math.round(page.height)} pixels and draws{' '}
            {Math.round(glyphs / 1000)}k residue letters, each its own SVG
            element. Export may be slow or fail — zooming out far enough to hide
            the letters exports the same alignment as an image instead.
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          // rendering runs on the main thread and a large figure holds it for
          // seconds; without this the button stays live through the freeze and
          // a second click starts a second export
          disabled={exporting}
          startIcon={
            exporting ? <CircularProgress size={16} color="inherit" /> : null
          }
          onClick={() => {
            setExporting(true)
            afterPaint(() => {
              void model
                .exportSVG({
                  theme,
                  includeMinimap,
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
                .finally(() => {
                  setExporting(false)
                })
            })
          }}
        >
          {exporting ? 'Exporting…' : 'Export'}
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
})

export default ExportSVGDialog
