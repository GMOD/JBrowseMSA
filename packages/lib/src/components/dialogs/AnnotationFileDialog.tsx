import React, { useState } from 'react'

import { Dialog, ErrorMessage } from '@jbrowse/core/ui'
import {
  Button,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import { observer } from 'mobx-react'
import {
  annotationsToGFF,
  interProScanResponseToAnnotations,
} from 'msa-parsers'

import type { MsaViewModel } from '../../model.ts'
import type { InterProScanResponse } from 'msa-parsers'

// GFF3 as the CLI writes it, or the JSON an InterProScan run returns. Both
// arrive as text and the model keeps GFF, so the JSON is converted on the way
// in rather than given a second path through the model
function toGFF(text: string) {
  const trimmed = text.trimStart()
  if (!trimmed.startsWith('{')) {
    return text
  }
  const response: InterProScanResponse = JSON.parse(trimmed)
  return annotationsToGFF(interProScanResponseToAnnotations(response))
}

async function fetchText(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} fetching ${url} ${await response.text()}`,
    )
  }
  return response.text()
}

const AnnotationFileDialog = observer(function ({
  handleClose,
  model,
}: {
  handleClose: () => void
  model: MsaViewModel
}) {
  const [file, setFile] = useState<File>()
  const [choice, setChoice] = useState('file')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(false)

  // the error is shown here rather than notified: the standalone app and the
  // MSAViewer component have no jbrowse session to notify, and asking one for
  // its notify() threw out of the success path into the catch, which threw
  // again on the same missing session
  return (
    <Dialog
      maxWidth="xl"
      title="Open annotation file"
      onClose={() => {
        handleClose()
      }}
      open
    >
      <DialogContent>
        {error ? <ErrorMessage error={error} /> : null}
        <Typography>
          Open a GFF3 file of annotations, such as the one `react-msaview-cli
          interpro` writes, or the JSON an InterProScan run returns.
        </Typography>

        <div style={{ display: 'flex', margin: 30 }}>
          <FormControl component="fieldset">
            <RadioGroup
              value={choice}
              onChange={event => {
                setChoice(event.target.value)
              }}
            >
              <FormControlLabel value="url" control={<Radio />} label="URL" />
              <FormControlLabel value="file" control={<Radio />} label="File" />
            </RadioGroup>
          </FormControl>
          {choice === 'url' ? (
            <div>
              <Typography>Open an annotation file from a URL</Typography>
              <TextField
                label="URL"
                value={url}
                onChange={event => {
                  setUrl(event.target.value)
                }}
              />
            </div>
          ) : (
            <div style={{ paddingTop: 20 }}>
              <Typography>
                Open an annotation file from your local drive
              </Typography>
              <Button variant="outlined" component="label">
                Choose File
                <input
                  type="file"
                  hidden
                  onChange={({ target }) => {
                    const chosen = target.files?.[0]
                    if (chosen) {
                      setFile(chosen)
                    }
                  }}
                />
              </Button>
              {file ? <Typography>{file.name}</Typography> : null}
            </div>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          disabled={loading || (choice === 'file' ? !file : !url.trim())}
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ;(async () => {
              setLoading(true)
              setError(undefined)
              try {
                const text = await (choice === 'file' && file
                  ? file.text()
                  : fetchText(url))
                // through the model's own GFF text, so the annotations travel
                // in the snapshot and the shared URL like every other layer.
                // Setting them straight onto the volatile left a view whose
                // link opened without them
                model.setGFF(toGFF(text))
                model.setShowDomains(true)
                handleClose()
              } catch (e) {
                console.error(e)
                setError(e)
              } finally {
                setLoading(false)
              }
            })()
          }}
        >
          Open annotations
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            handleClose()
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
})

export default AnnotationFileDialog
