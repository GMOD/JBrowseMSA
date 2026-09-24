import React, { useState } from 'react'

import { ErrorMessage, FileSelector } from '@jbrowse/core/ui'
import { Box, Button, Container, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import ImportFormExamples from './ImportFormExamples.tsx'
import { load } from './util.ts'

import type { MsaViewModel } from '../../model.ts'
import type { FileLocation } from '@jbrowse/core/util/types'

const phone = '@media (max-width: 640px)'

const ImportForm = observer(function ({ model }: { model: MsaViewModel }) {
  const [msaFile, setMsaFile] = useState<FileLocation>()
  const [treeFile, setTreeFile] = useState<FileLocation>()
  const [gffFile, setGffFile] = useState<FileLocation>()
  const { error } = model

  return (
    <Container>
      <Box sx={{ width: '50%', [phone]: { width: '100%' } }}>
        {error ? <ErrorMessage error={error} /> : null}
        <Typography>
          Open an MSA file (FASTA, Stockholm, Clustal, A3M or EMF format) and/or
          a tree file (Newick format).
        </Typography>
        <Typography color="text.secondary">
          An MSA alone or a tree alone is enough, and a Stockholm file with an
          embedded tree needs no separate tree file.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '40px',
          [phone]: {
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '16px',
          },
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
            <Typography>Annotation GFF file or URL (optional)</Typography>
            <FileSelector location={gffFile} setLocation={setGffFile} />
          </div>
        </div>
        <div>
          <Button
            onClick={() => {
              try {
                load(model, msaFile, treeFile, gffFile)
              } catch (e) {
                console.error(e)
                model.setError(e)
              }
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
      </Box>
    </Container>
  )
})

export default ImportForm
