import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'

import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { ThemeProvider } from '@mui/material/styles'

import {
  DEFAULT_WINDOW_SIZE,
  buildSessionUrl,
  collapsedLoc,
  loadGene,
  searchGenes,
} from '../lib/geneExplorer'
import { theme } from '../lib/theme'

import type { GeneResult } from '../lib/geneExplorer'

// curated, all present in the 100-way index — chosen to span tumour
// suppressors, oncogenes/drug targets, classic disease genes, and size extremes
// (tiny HBB vs. titin, the largest human gene) so the collapsed-intron ratio and
// the conservation vary visibly between picks
const EXAMPLES: { symbol: string; note: string }[] = [
  {
    symbol: 'TP53',
    note: 'Tumour suppressor — mutated in ~half of all cancers',
  },
  {
    symbol: 'KRAS',
    note: 'Oncogene — small and almost invariant across vertebrates',
  },
  { symbol: 'BRAF', note: 'Melanoma V600E kinase' },
  { symbol: 'EGFR', note: 'Receptor tyrosine kinase and major drug target' },
  { symbol: 'PTEN', note: 'Tumour-suppressor phosphatase' },
  {
    symbol: 'BRCA1',
    note: 'Hereditary breast/ovarian cancer — large multi-exon gene',
  },
  { symbol: 'CFTR', note: 'Cystic fibrosis chloride channel' },
  { symbol: 'HBB', note: 'β-globin (sickle cell) — tiny 3-exon gene' },
  {
    symbol: 'TTN',
    note: 'Titin — the largest human gene, extreme intron collapse',
  },
  { symbol: 'SOD1', note: 'ALS — small and highly conserved' },
]
const EXAMPLE_SYMBOLS = EXAMPLES.map(e => e.symbol)
const NOTE_BY_SYMBOL = new Map(EXAMPLES.map(e => [e.symbol, e.note]))

function subscribeGeneUrl(cb: () => void) {
  window.addEventListener('popstate', cb)
  window.addEventListener('gene-url-change', cb)
  return () => {
    window.removeEventListener('popstate', cb)
    window.removeEventListener('gene-url-change', cb)
  }
}

function getGeneFromUrl() {
  return new URLSearchParams(window.location.search).get('gene')
}

export default function GeneExplorer() {
  const [hits, setHits] = useState<string[]>(EXAMPLE_SYMBOLS)
  const [inputValue, setInputValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<GeneResult>()
  const [helpOpen, setHelpOpen] = useState(false)

  // show the curated examples until there's a real query to suggest against
  const options = inputValue.length >= 2 ? hits : EXAMPLE_SYMBOLS

  // Reactive URL read: re-renders on popstate (back/forward) and pushState via
  // the gene-url-change event dispatched by navigate() below.
  const urlGene = useSyncExternalStore(
    subscribeGeneUrl,
    getGeneFromUrl,
    () => null,
  )

  // Debounced, race-safe type-ahead: query mygene.info 200ms after typing
  // stops (not once per keystroke), and drop a response whose input has since
  // changed so a slow earlier request can't clobber a newer one's suggestions.
  useEffect(() => {
    if (inputValue.length < 2) {
      return
    }
    let ignore = false
    const timer = setTimeout(() => {
      searchGenes(inputValue)
        .then(found => {
          if (!ignore && found.length > 0) {
            setHits(found)
          }
        })
        .catch(() => {
          // type-ahead is best-effort; keep the last suggestions
        })
    }, 200)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [inputValue])

  const onPick = useCallback(async (symbol: string) => {
    setBusy(true)
    setError(undefined)
    const outcome = await loadGene(symbol).then(
      result => ({ result, error: undefined }),
      (e: unknown) => ({
        result: undefined,
        error: e instanceof Error ? e.message : String(e),
      }),
    )
    // discard result if the URL moved on while this fetch was in flight
    if (getGeneFromUrl() === symbol) {
      setResult(outcome.result)
      setError(outcome.error)
      setBusy(false)
    }
  }, [])

  // Fetch whenever the URL gene changes (initial load, back/forward, navigate).
  useEffect(() => {
    if (urlGene) {
      void onPick(urlGene)
    }
  }, [urlGene, onPick])

  // Push the picked gene into the page URL (?gene=) so the selection is
  // shareable, bookmarkable, and survives reload.
  function navigate(symbol: string | null) {
    if (symbol) {
      const next = new URL(window.location.href)
      next.searchParams.set('gene', symbol)
      window.history.pushState(null, '', next)
      window.dispatchEvent(new Event('gene-url-change'))
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'flex-start',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          maxWidth: 900,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 2.5 },
            flex: '0 0 auto',
            width: { xs: '100%', sm: 300 },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Explore a gene
            </Typography>
            <Tooltip title="How it works">
              <IconButton
                size="small"
                aria-label="How the gene explorer works"
                onClick={() => {
                  setHelpOpen(true)
                }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Autocomplete
            freeSolo
            fullWidth
            openOnFocus
            options={options}
            inputValue={inputValue}
            onInputChange={(_e, v) => {
              setInputValue(v)
            }}
            onChange={(_e, v) => {
              navigate(typeof v === 'string' ? v : null)
            }}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props
              const note = NOTE_BY_SYMBOL.get(option)
              return (
                <li key={key} {...optionProps}>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, lineHeight: 1.3 }}
                    >
                      {option}
                    </Typography>
                    {note ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        {note}
                      </Typography>
                    ) : null}
                  </Box>
                </li>
              )
            }}
            renderInput={params => (
              <TextField
                {...params}
                label="Gene symbol"
                placeholder="e.g. TP53"
                helperText="Type any human gene, or pick below"
                size="small"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {busy ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1.5, mb: 0.5 }}
          >
            Examples
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {EXAMPLES.map(ex => (
              <Tooltip key={ex.symbol} title={ex.note}>
                <Button
                  size="small"
                  variant="text"
                  sx={{ minWidth: 0, px: 1, py: 0.25, textTransform: 'none' }}
                  onClick={() => {
                    navigate(ex.symbol)
                  }}
                >
                  {ex.symbol}
                </Button>
              </Tooltip>
            ))}
          </Box>

          {urlGene && NOTE_BY_SYMBOL.get(urlGene) ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              <strong>{urlGene}</strong> — {NOTE_BY_SYMBOL.get(urlGene)}
            </Typography>
          ) : null}
        </Paper>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          {result ? (
            <Box
              sx={{
                opacity: busy ? 0.5 : 1,
                transition: 'opacity 0.2s',
                pointerEvents: busy ? 'none' : 'auto',
              }}
            >
              <ResultPanel result={result} />
            </Box>
          ) : null}
        </Box>
      </Box>

      <HelpDialog
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false)
        }}
      />
    </ThemeProvider>
  )
}

function ResultPanel({ result }: { result: GeneResult }) {
  const { transcript, uniprotId, msa } = result
  // Stats describe the CODING model (transcript.cds), so they mean the same
  // thing whether the transcript came from the .cds sidecar or the RefSeq
  // fallback. transcript.exons is coding-only for the former but full mRNA
  // (incl. UTR) for the latter, so it can't be labelled consistently.
  const codingBp = transcript.cds.reduce((s, c) => s + (c.end - c.start), 0)
  const span =
    Math.max(...transcript.cds.map(c => c.end)) -
    Math.min(...transcript.cds.map(c => c.start))
  const ratio = (span / codingBp).toFixed(1)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // launch the genome view with introns squeezed out (default) vs. the whole
  // gene; recomputes the loc/url/session spec below
  const [collapse, setCollapse] = useState(true)
  const { url, session } = useMemo(
    () =>
      buildSessionUrl({
        transcript,
        uniprotId,
        proteinSequence: msa?.querySequence,
        msaAvailable: !!msa,
        collapseIntrons: collapse,
      }),
    [transcript, uniprotId, msa, collapse],
  )
  const loc = useMemo(
    () => collapsedLoc(transcript, { collapse }),
    [transcript, collapse],
  )
  const sessionJson = JSON.stringify(session, null, 2)

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Typography variant="h6" component="h2" sx={{ mb: 0.25 }}>
        {transcript.geneName}{' '}
        <Typography component="span" variant="body2" color="text.secondary">
          {transcript.name}
        </Typography>
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {transcript.refName} {transcript.strand === 1 ? '+' : '−'} ·{' '}
        {transcript.cds.length} coding exons
        {msa ? ` · ${msa.rowCount}-species alignment` : ''}
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
        <Button variant="contained" href={url} target="_blank" rel="noopener">
          Open in JBrowse ↗
        </Button>
        <Tooltip title="Session details">
          <IconButton
            size="small"
            aria-label="Session details"
            onClick={() => {
              setDetailsOpen(true)
            }}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <FormControlLabel
        sx={{ mt: 0.5, ml: -0.5, display: 'flex' }}
        control={
          <Checkbox
            size="small"
            checked={collapse}
            onChange={event => {
              setCollapse(event.target.checked)
            }}
          />
        }
        label={`Collapse introns (±${DEFAULT_WINDOW_SIZE} bp around exons)`}
      />

      {msa ? null : (
        <Alert severity="info" sx={{ mt: 2 }}>
          No 100-way alignment for {transcript.geneName} — it isn&apos;t in the
          UCSC knownCanonical set. The collapsed genome view (and its JBrowse
          link) still work.
        </Alert>
      )}

      <DetailsDialog
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
        }}
        loc={loc}
        sessionJson={sessionJson}
        codingBp={codingBp}
        span={span}
        ratio={ratio}
        uniprotId={uniprotId}
      />
    </Paper>
  )
}

function DetailsDialog({
  open,
  onClose,
  loc,
  sessionJson,
  codingBp,
  span,
  ratio,
  uniprotId,
}: {
  open: boolean
  onClose: () => void
  loc: string
  sessionJson: string
  codingBp: number
  span: number
  ratio: string
  uniprotId: string | undefined
}) {
  const [copied, setCopied] = useState<string>()

  function copy(text: string, message: string) {
    void navigator.clipboard.writeText(text)
    setCopied(message)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
        }}
      >
        Session details
        <IconButton
          aria-label="Close"
          onClick={() => {
            onClose()
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {codingBp.toLocaleString()} CDS bp / {span.toLocaleString()} bp coding
          span ({ratio}× collapsed)
          {uniprotId ? ` · UniProt ${uniprotId}` : ''}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 1.5 }}
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
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1.5,
            maxHeight: 280,
            overflow: 'auto',
            fontSize: 11,
            fontFamily: 'monospace',
            bgcolor: 'action.hover',
            borderRadius: 1,
          }}
        >
          {sessionJson}
        </Box>
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
      <Snackbar
        open={!!copied}
        autoHideDuration={2000}
        onClose={() => {
          setCopied(undefined)
        }}
        message={copied}
      />
    </Dialog>
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

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const base = import.meta.env.BASE_URL
  const [copied, setCopied] = useState(false)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 1,
        }}
      >
        How the gene explorer works
        <IconButton
          aria-label="Close"
          onClick={() => {
            onClose()
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
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
            <strong>mygene.info</strong> resolves the gene symbol to its hg38
            locus and UniProt accession (and powers the type-ahead).
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            The canonical (MANE / RefSeq Select) transcript is pulled by locus
            from the UCSC <Code>ncbiRefSeqSelect</Code> GFF over{' '}
            <strong>tabix</strong>, then the GFF is parsed in the browser — that
            is where the exon/CDS model comes from.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            The <strong>AlphaFold</strong> structure is fetched by UniProt
            accession. Only the 100-way alignment is a hosted file (a slice of a
            genome-scale alignment), random-read by gene name from an indexed
            bgzip FASTA.
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
              void navigator.clipboard.writeText(BUILD_SNIPPET)
              setCopied(true)
              setTimeout(() => {
                setCopied(false)
              }, 1500)
            }}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              bgcolor: 'background.paper',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              overflow: 'auto',
              fontSize: 12,
              fontFamily: 'monospace',
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            {BUILD_SNIPPET}
          </Box>
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
    </Dialog>
  )
}
