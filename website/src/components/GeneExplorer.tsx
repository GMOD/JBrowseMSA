import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined'
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
  geneStats,
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

// Debounced, race-safe gene-symbol type-ahead. Only user keystrokes feed `query`
// (selecting a gene resets the input to the full symbol, which shouldn't re-search
// what we just resolved), so suggestions stay a pure function of what was typed;
// the cleanup drops a slow earlier response so it can't clobber a newer one.
function useGeneSuggestions(query: string) {
  const [hits, setHits] = useState<string[]>(EXAMPLE_SYMBOLS)
  useEffect(() => {
    if (query.length < 2) {
      return
    }
    let ignore = false
    const timer = setTimeout(() => {
      searchGenes(query)
        .then(found => {
          // set even when empty: a no-match query clears stale suggestions
          if (!ignore) {
            setHits(found)
          }
        })
        .catch(() => {
          // best-effort; keep the last suggestions on a network error
        })
    }, 200)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [query])
  return hits
}

interface GeneOutcome {
  symbol: string | null // the gene this result/error describes
  result?: GeneResult
  error?: string
}

// Load everything the result panel renders for the gene named in the URL. The
// only stored state is the last completed outcome; `busy` is DERIVED — we're
// loading whenever the URL's gene isn't the one the outcome describes — so no
// flag has to be kept in sync with a setState inside the effect. The effect just
// fetches; the ignore flag makes switching genes race-safe.
// https://react.dev/learn/you-might-not-need-an-effect
function useGene(symbol: string | null) {
  const [outcome, setOutcome] = useState<GeneOutcome>({ symbol: null })
  useEffect(() => {
    if (!symbol) {
      return
    }
    let ignore = false
    loadGene(symbol).then(
      result => {
        if (!ignore) {
          setOutcome({ symbol, result })
        }
      },
      (e: unknown) => {
        if (!ignore) {
          setOutcome({
            symbol,
            error: e instanceof Error ? e.message : String(e),
          })
        }
      },
    )
    return () => {
      ignore = true
    }
  }, [symbol])

  return {
    busy: symbol !== null && outcome.symbol !== symbol,
    // keep the previous result as a stable placeholder while the next loads (the
    // caller dims it); never surface an error for a gene the URL has left
    result: outcome.result,
    error: outcome.symbol === symbol ? outcome.error : undefined,
  }
}

export default function GeneExplorer() {
  // Reactive URL read: re-renders on popstate (back/forward) and on the
  // gene-url-change event dispatched by navigate() below.
  const urlGene = useSyncExternalStore(
    subscribeGeneUrl,
    getGeneFromUrl,
    () => null,
  )

  const [inputValue, setInputValue] = useState(urlGene ?? '')
  // the text driving the type-ahead: only keystrokes update it, so selecting a
  // gene (which resets inputValue to the full symbol) doesn't re-fire a search
  const [searchTerm, setSearchTerm] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  // Keep the search box showing the gene the URL points at, whatever moved it
  // there — an Example chip, browser back/forward, or a shared ?gene= link — not
  // just Autocomplete selections. Adjusting state during render (vs. an effect)
  // is the idiomatic sync here: searchTerm is deliberately untouched so restoring
  // the symbol doesn't re-fire the type-ahead.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [syncedGene, setSyncedGene] = useState(urlGene)
  if (urlGene !== syncedGene) {
    setSyncedGene(urlGene)
    setInputValue(urlGene ?? '')
  }

  const hits = useGeneSuggestions(searchTerm)
  const { busy, result, error } = useGene(urlGene)

  // show the curated examples until there's a real query to suggest against
  const options = searchTerm.length >= 2 ? hits : EXAMPLE_SYMBOLS

  // Reflect the selection in the page URL (?gene=) so it's shareable,
  // bookmarkable, and survives reload; clearing the Autocomplete removes it.
  function navigate(symbol: string | null) {
    const next = new URL(window.location.href)
    if (symbol) {
      next.searchParams.set('gene', symbol)
    } else {
      next.searchParams.delete('gene')
    }
    // re-picking the current gene shouldn't stack a duplicate history entry (or
    // re-fire a fetch); only navigate when the URL actually changes
    if (next.href !== window.location.href) {
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
        <GeneSearchPanel
          inputValue={inputValue}
          options={options}
          busy={busy}
          urlGene={urlGene}
          onInputChange={(value, isKeystroke) => {
            setInputValue(value)
            // only a keystroke should drive a new type-ahead query; the 'reset'
            // fired when a gene is selected would re-search its full symbol
            if (isKeystroke) {
              setSearchTerm(value)
            }
          }}
          onSelect={symbol => {
            navigate(symbol)
          }}
          onOpenHelp={() => {
            setHelpOpen(true)
          }}
        />

        <GeneResultArea
          urlGene={urlGene}
          error={error}
          result={result}
          busy={busy}
        />
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

// Left column: gene-symbol type-ahead, the curated Example chips, and a note for
// the current gene. Purely presentational — all state lives in GeneExplorer.
function GeneSearchPanel({
  inputValue,
  options,
  busy,
  urlGene,
  onInputChange,
  onSelect,
  onOpenHelp,
}: {
  inputValue: string
  options: string[]
  busy: boolean
  urlGene: string | null
  // isKeystroke distinguishes typing (drives the type-ahead) from the 'reset'
  // that fires when a value is selected
  onInputChange: (value: string, isKeystroke: boolean) => void
  onSelect: (symbol: string | null) => void
  onOpenHelp: () => void
}) {
  const urlGeneNote = urlGene ? NOTE_BY_SYMBOL.get(urlGene) : undefined
  return (
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
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Explore a gene
        </Typography>
        <Tooltip title="How it works">
          <IconButton
            size="small"
            aria-label="How the gene explorer works"
            onClick={() => {
              onOpenHelp()
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
        onInputChange={(_e, v, reason) => {
          onInputChange(v, reason === 'input')
        }}
        onChange={(_e, v) => {
          onSelect(typeof v === 'string' ? v : null)
        }}
        renderOption={(props, option) => {
          const { key, ...optionProps } = props
          return (
            <li key={key} {...optionProps}>
              <GeneOption symbol={option} />
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
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {busy ? (
                      <CircularProgress color="inherit" size={18} />
                    ) : null}
                    {params.slotProps.input.endAdornment}
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
                onSelect(ex.symbol)
              }}
            >
              {ex.symbol}
            </Button>
          </Tooltip>
        ))}
      </Box>

      {urlGeneNote ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          <strong>{urlGene}</strong> — {urlGeneNote}
        </Typography>
      ) : null}
    </Paper>
  )
}

// One type-ahead row: the symbol, with its curated note underneath when it's one
// of the examples (typed hits have no note).
function GeneOption({ symbol }: { symbol: string }) {
  const note = NOTE_BY_SYMBOL.get(symbol)
  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
        {symbol}
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
  )
}

// Right column: the loaded gene's panel or its error, both gated on urlGene so
// clearing the selection empties the column without syncing state in an effect.
// The previous result stays mounted and dimmed while the next gene loads.
function GeneResultArea({
  urlGene,
  error,
  result,
  busy,
}: {
  urlGene: string | null
  error: string | undefined
  result: GeneResult | undefined
  busy: boolean
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {urlGene && error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {urlGene && result ? (
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
  )
}

function ResultPanel({ result }: { result: GeneResult }) {
  const { transcript, uniprotId, msa, proteinSequence } = result
  const { codingBp, span, ratio } = geneStats(transcript)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // launch the genome view with introns squeezed out (default) vs. the whole
  // gene; recomputes the loc/url/session spec below
  const [collapse, setCollapse] = useState(true)
  const { url, session } = useMemo(
    () =>
      buildSessionUrl({
        transcript,
        uniprotId,
        proteinSequence,
        msaAvailable: !!msa,
        collapseIntrons: collapse,
      }),
    [transcript, uniprotId, msa, proteinSequence, collapse],
  )
  const loc = useMemo(
    () => collapsedLoc(transcript, { collapse }),
    [transcript, collapse],
  )
  const sessionJson = useMemo(() => JSON.stringify(session, null, 2), [session])

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

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
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
          UCSC knownCanonical set. The collapsed genome view
          {uniprotId ? ' and AlphaFold structure' : ''} (and the JBrowse link)
          still work.
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
    </Dialog>
  )
}
