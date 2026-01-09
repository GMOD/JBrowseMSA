import React, { useState } from 'react'

import { ErrorMessage, FileSelector } from '@jbrowse/core/ui'
import { Button, Container, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import ImportFormExamples from './ImportFormExamples'
import { load } from './util'

import type { MsaViewModel } from '../../model'
import type { FileLocation } from '@jbrowse/core/util/types'

const ImportForm = observer(function ({ model }: { model: MsaViewModel }) {
  const [msaFile, setMsaFile] = useState<FileLocation>()
  const [treeFile, setTreeFile] = useState<FileLocation>()
  const [gffFile, setGffFile] = useState<FileLocation>()
  const { error } = model

  return (
    <Container>
      <div style={{ width: '50%' }}>
        {error ? <ErrorMessage error={error} /> : null}
        <Typography>
          Open an MSA file (stockholm or clustal format) and/or a tree file
          (newick format).
        </Typography>
        <Typography color="error">
          Note: you can open up just an MSA or just a tree, both are not
          required. Some MSA files e.g. stockholm format have an embedded tree
          also and this is fine, and opening a separate tree file is not
          required.
        </Typography>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 40,
        }}
      >
        <div>
          <div>
            <Typography>MSA file or URL</Typography>
            <FileSelector location={msaFile} setLocation={setMsaFile} />
          </div>
          <div>
            <Typography>Tree file or URL</Typography>
            <FileSelector location={treeFile} setLocation={setTreeFile} />
          </div>
          <div>
            <Typography>InterProScan GFF file or URL (optional)</Typography>
            <FileSelector location={gffFile} setLocation={setGffFile} />
          </div>
        </div>
        <div>
          <Button
            onClick={() => {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              ;(async () => {
                try {
                  await load(model, msaFile, treeFile, gffFile)
                } catch (e) {
                  console.error(e)
                  model.setError(e)
                }
              })()
            }}
            variant="contained"
            color="primary"
            disabled={!msaFile && !treeFile}
          >
            Open
          </Button>
        </div>

        <div>
          <Typography>Examples</Typography>
          <ImportFormExamples model={model} />
        </div>
      </div>
    </Container>
  )
})

export default ImportForm
