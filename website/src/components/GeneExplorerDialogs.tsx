import { useMemo, useState } from 'react'

import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { collapsedLoc, geneStats } from '../lib/geneExplorer'
import { fetchProteinStl } from '../lib/proteinStl'

import type { Session, Transcript } from '../lib/geneExplorer'
import type { ReactNode } from 'react'

// Copy text to the clipboard and confirm it in a Snackbar the caller renders. A
// rejected write (insecure context or denied permission) reports the failure
// rather than a false confirmation.
function useCopy() {
  const [message, setMessage] = useState<string>()
  const copy = (text: string, successMessage: string) => {
    void navigator.clipboard.writeText(text).then(
      () => {
        setMessage(successMessage)
      },
      () => {
        setMessage('Copy failed — clipboard access was blocked')
      },
    )
  }
  const snackbar = (
    <Snackbar
      open={!!message}
      autoHideDuration={2000}
      onClose={() => {
        setMessage(undefined)
      }}
      message={message}
    />
  )
  return { copy, snackbar }
}

// Save generated STL bytes to the user's disk via a throwaway object URL. The
// revoke waits a tick: Firefox starts the download asynchronously and drops it
// if the URL is gone by then.
function triggerDownload(bytes: Uint8Array<ArrayBuffer>, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'model/stl' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

// Dialog title row with a close button pinned to the right — shared by both
// modals so the header layout stays identical.
function DialogHeader({
  title,
  onClose,
}: {
  title: ReactNode
  onClose: () => void
}) {
  return (
    <DialogTitle
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pr: 1,
      }}
    >
      {title}
      <IconButton
        aria-label="Close"
        onClick={() => {
          onClose()
        }}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>
  )
}

// A scrollable monospace <pre> block tinted to match the surrounding paper.
function CodeBlock({
  children,
  fontSize = 12,
  maxHeight,
}: {
  children: ReactNode
  fontSize?: number
  maxHeight?: number
}) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        overflow: 'auto',
        fontSize,
        fontFamily: 'monospace',
        bgcolor: 'action.hover',
        borderRadius: 1,
        maxHeight,
      }}
    >
      {children}
    </Box>
  )
}

// Inline code token, styled to read like a code span inside the dialog (the
// global .prose code rule doesn't reach this portal-rendered content).
function Code({ children }: { children: ReactNode }) {
  return (
    <Box
      component="code"
      sx={{
        fontFamily: 'monospace',
        fontSize: '0.85em',
        bgcolor: 'action.hover',
        px: 0.5,
        borderRadius: 0.5,
      }}
    >
      {children}
    </Box>
  )
}

export function SessionDetailsDialog({
  open,
  onClose,
  transcript,
  session,
  collapse,
  flip,
  uniprotId,
}: {
  open: boolean
  onClose: () => void
  transcript: Transcript
  session: Session
  collapse: boolean
  flip: boolean
  uniprotId: string | undefined
}) {
  const { copy, snackbar } = useCopy()
  // STL export runs on click (fetch AlphaFold + build mesh), so it's a plain
  // async handler — busy drives the spinner, stlError surfaces failures.
  const [stlBusy, setStlBusy] = useState(false)
  const [stlError, setStlError] = useState<string>()
  const { codingBp, span, ratio } = geneStats(transcript)
  const loc = collapsedLoc(transcript, { collapse, flip })
  // a titin session is ~100 KB of JSON, and only the open dialog shows it
  const sessionJson = useMemo(
    () => (open ? JSON.stringify(session, null, 2) : ''),
    [open, session],
  )

  function downloadStl(accession: string) {
    setStlBusy(true)
    fetchProteinStl(accession)
      .then(bytes => {
        triggerDownload(bytes, `${transcript.geneName}-${accession}.stl`)
      })
      .catch((e: unknown) => {
        setStlError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        setStlBusy(false)
      })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
    >
      <DialogHeader title="Session details" onClose={onClose} />
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {codingBp.toLocaleString()} CDS bp / {span.toLocaleString()} bp coding
          span ({ratio}× collapsed)
          {uniprotId ? ` · UniProt ${uniprotId}` : ''}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap', mb: 1.5 }}
        >
          <Button
            size="small"
            onClick={() => {
              copy(window.location.href, 'Page link copied')
            }}
          >
            Copy page link
          </Button>
          <Button
            size="small"
            onClick={() => {
              copy(sessionJson, 'Session JSON copied')
            }}
          >
            Copy session JSON
          </Button>
          {uniprotId ? (
            <Tooltip title="Download a 3D-printable STL of the AlphaFold structure (a solid tube swept along the protein backbone)">
              <span>
                <Button
                  size="small"
                  disabled={stlBusy}
                  startIcon={
                    stlBusy ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <ViewInArIcon />
                    )
                  }
                  onClick={() => {
                    downloadStl(uniprotId)
                  }}
                >
                  {stlBusy ? 'Preparing STL…' : '3D print (STL)'}
                </Button>
              </span>
            </Tooltip>
          ) : null}
        </Stack>
        <Paper
          variant="outlined"
          sx={{ p: 1.5, mb: 1.5, overflowX: 'auto', bgcolor: 'action.hover' }}
        >
          <Box
            component="code"
            sx={{ fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre' }}
          >
            {loc}
          </Box>
        </Paper>
        <CodeBlock fontSize={11} maxHeight={280}>
          {sessionJson}
        </CodeBlock>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose()
          }}
        >
          Close
        </Button>
      </DialogActions>
      {snackbar}
      <Snackbar
        open={!!stlError}
        autoHideDuration={5000}
        onClose={() => {
          setStlError(undefined)
        }}
        message={stlError ? `Couldn't build STL: ${stlError}` : undefined}
      />
    </Dialog>
  )
}

// The "spec → URL" skeleton shown in the help modal, mirroring buildSessionUrl()
// in lib/geneExplorer.ts.
const BUILD_SNIPPET = `// A JBrowse session is just an array of views, linked to each other by id.
// You open one by putting the spec in the URL hash (#) — no server, no build
// step. The hash fragment never reaches the server, so there's no URL-length
// limit (a long ?query= would 414); the live explorer also gzips the session
// into a 'session=encoded-…' param to keep big genes compact.
const spec = {
  views: [
    {
      type: 'LinearGenomeView',
      id: 'lgv',
      assembly: 'hg38',
      // the collapsed-intron trick: a loc made of the exon ranges,
      // space-separated, so the exons render back-to-back
      loc: 'chr17:7,673,534-7,673,608 chr17:7,673,700-7,673,837',
      tracks: ['hg38-ncbiRefSeqSelect'],
    },
    {
      type: 'MsaView',           // jbrowse-plugin-msaview
      connectedViewId: 'lgv',    // <- this is what links it to the genome view
      connectedFeature: feature, // the transcript model (CDS start/end/phase)
      msaIndexedLocation: { uri: MSA_URL },
      msaName: 'TP53',           // random-read this gene's block by name
      treeFileLocation: { uri: TREE_URL },
    },
    {
      type: 'ProteinView',       // jbrowse-plugin-protein3d
      connectedViewId: 'lgv',
      feature,
      url: 'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif',
    },
  ],
}

const url =
  JBROWSE + '#config=' + encodeURIComponent(CONFIG) +
  '&session=spec-' + encodeURIComponent(JSON.stringify(spec))`

export function HelpDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const base = import.meta.env.BASE_URL
  const { copy, snackbar } = useCopy()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogHeader title="How the gene explorer works" onClose={onClose} />
      <DialogContent dividers>
        <Typography variant="subtitle2" gutterBottom>
          Under the hood
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Nothing is precomputed per gene — the whole session is synthesized
          live in your browser from public data:
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0, mb: 2, '& li': { mb: 1 } }}>
          <Typography component="li" variant="body2" color="text.secondary">
            <strong>Human</strong> resolves through <strong>mygene.info</strong>{' '}
            (hg38 locus + UniProt). The transcript model comes from the
            alignment's own knownCanonical CDS sidecar, so genome, alignment and
            structure share one coordinate space; genes outside the 100-way set
            fall back to the UCSC <Code>ncbiRefSeqSelect</Code> GFF over{' '}
            <strong>tabix</strong>.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            <strong>Other species</strong> resolve through{' '}
            <strong>NCBI Datasets</strong> (GeneID, assembly, Swiss-Prot); the
            genomic exon/CDS model is parsed from the E-utils{' '}
            <Code>gene_table</Code>. The session opens on the JBrowse config{' '}
            <strong>genomes.jbrowse.org</strong> publishes for that{' '}
            <strong>UCSC GenArk</strong> assembly, which already carries the
            genome, the NCBI gene tracks and both plugins.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            The <strong>AlphaFold</strong> structure is fetched by UniProt
            accession. The alignment is the hosted 100-way for human; outside
            human the session carries an <Code>orthologParams</Code> request and
            the msaview plugin builds it on open — NCBI orthologs aligned at{' '}
            <strong>EBI Clustal Omega</strong>.
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          There is no <Code>collapseIntrons</Code> option in JBrowse. The trick
          is to give the Linear Genome View a <Code>loc</Code> made of the exon
          ranges, space-separated, so each renders back-to-back and the introns
          disappear. The alignment and structure stay in sync because all three
          views share the same transcript model, so a residue maps to its codon
          and back.
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          Build the same thing yourself
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          A JBrowse session is a declarative <em>spec</em>: an array of views,
          each pointing at the others by <Code>connectedViewId</Code>. You don't
          write any wiring code — you describe the views, put the spec in the
          URL, and the{' '}
          <Link
            href="https://github.com/GMOD/jbrowse-plugin-msaview"
            target="_blank"
            rel="noopener"
          >
            msaview
          </Link>{' '}
          and{' '}
          <Link
            href="https://github.com/GMOD/jbrowse-plugin-protein3d"
            target="_blank"
            rel="noopener"
          >
            protein3d
          </Link>{' '}
          plugins handle the linking. The shape:
        </Typography>
        <Box sx={{ position: 'relative' }}>
          <Button
            size="small"
            startIcon={<ContentCopyIcon fontSize="small" />}
            onClick={() => {
              copy(BUILD_SNIPPET, 'Snippet copied')
            }}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              bgcolor: 'background.paper',
            }}
          >
            Copy
          </Button>
          <CodeBlock>{BUILD_SNIPPET}</CodeBlock>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          That's the entire mechanism — every link in the{' '}
          <Link href={`${base}/gallery#jbrowse`}>gallery</Link> is one of these
          URLs. The explorer just fills in the <Code>feature</Code>, exon
          ranges, and accessions for whatever gene you type. The full source is{' '}
          <Link
            href="https://github.com/GMOD/JBrowseMSA/blob/main/website/src/lib/geneExplorer.ts"
            target="_blank"
            rel="noopener"
          >
            geneExplorer.ts
          </Link>{' '}
          (see <Code>buildSessionUrl</Code>), and the URL-param API is
          documented under{' '}
          <Link
            href="https://jbrowse.org/jb2/docs/urlparams/"
            target="_blank"
            rel="noopener"
          >
            JBrowse URL params
          </Link>
          .
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose()
          }}
        >
          Close
        </Button>
      </DialogActions>
      {snackbar}
    </Dialog>
  )
}
