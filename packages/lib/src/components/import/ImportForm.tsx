import React, { useState } from 'react'

import { ErrorMessage, FileSelector } from '@jbrowse/core/ui'
import { Box, Button, Container, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import ImportFormExamples from './ImportFormExamples.tsx'
import { load } from './util.ts'

import type { MsaViewModel } from '../../model.ts'
import type { FileLocation } from '@jbrowse/core/util/types'

const phone = '@media (max-width: 640px)'

export interface ImportSlots {
  examples?: React.ReactNode
  examplesBelow?: boolean
}

const ImportForm = observer(function ({
  model,
  examples,
  examplesBelow,
}: { model: MsaViewModel } & ImportSlots) {
  const [msaFile, setMsaFile] = useState<FileLocation>()
  const [treeFile, setTreeFile] = useState<FileLocation>()
  const [gffFile, setGffFile] = useState<FileLocation>()
  const { error } = model

  return (
    <Container sx={{ pt: 2, pb: 3 }}>
      {examplesBelow ? null : examples}
      <Box sx={{ width: '50%', mb: 2, [phone]: { width: '100%' } }}>
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
        <Box
          sx={{
            width: 400,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            [phone]: { width: 'auto' },
          }}
        >
          <div>
            <Typography>MSA file or URL</Typography>
            <FileSelector
              inline
              rootModel={undefined}
              location={msaFile}
              setLocation={setMsaFile}
            />
          </div>
          <div>
            <Typography>Tree file or URL</Typography>
            <FileSelector
              inline
              rootModel={undefined}
              location={treeFile}
              setLocation={setTreeFile}
            />
          </div>
          <div>
            <Typography>Annotation GFF file or URL (optional)</Typography>
            <FileSelector
              inline
              rootModel={undefined}
              location={gffFile}
              setLocation={setGffFile}
            />
          </div>
        </Box>
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

        {examples ? null : (
          <div>
            <Typography>Examples</Typography>
            <ImportFormExamples model={model} />
          </div>
        )}
      </Box>
      {examplesBelow && examples ? <Box sx={{ mt: 5 }}>{examples}</Box> : null}
    </Container>
  )
})

export default ImportForm
