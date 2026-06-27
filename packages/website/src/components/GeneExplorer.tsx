import { useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ThemeProvider } from '@mui/material/styles'
import { MSAViewer } from 'react-msaview'

import { theme } from '../lib/theme'

import {
  DEFAULT_WINDOW_SIZE,
  buildSessionSpec,
  collapsedLoc,
  exonBp,
  fetchGeneCds,
  fetchGeneMsa,
  fetchTranscript,
  genomicSpanBp,
  resolveGene,
  searchGenes,
} from '../lib/geneExplorer'

import type { GeneMsa, Transcript } from '../lib/geneExplorer'

interface Result {
  transcript: Transcript
  uniprotId?: string
  msa?: GeneMsa
}

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

export default function GeneExplorer() {
  const [options, setOptions] = useState<string[]>(EXAMPLE_SYMBOLS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [result, setResult] = useState<Result>()
  // the picked gene + its one-line "why it's interesting" note (for the curated
  // examples), shown on the page so it doesn't hide in a tooltip
  const [picked, setPicked] = useState<{ symbol: string; note?: string }>()
  // monotonic id of the latest pick, so a slow earlier request can't overwrite
  // the result of a later one if the user switches genes mid-fetch
  const latestPick = useRef(0)

  async function onSearch(query: string) {
    if (query.length >= 2) {
      try {
        const hits = await searchGenes(query)
        if (hits.length > 0) {
          setOptions(hits)
        }
      } catch {
        // type-ahead is best-effort; keep the last options
      }
    } else {
      setOptions(EXAMPLE_SYMBOLS)
    }
  }

  async function onPick(symbol: string | null) {
    if (symbol) {
      const pickId = ++latestPick.current
      setBusy(true)
      setError(undefined)
      setResult(undefined)
      setPicked({ symbol, note: NOTE_BY_SYMBOL.get(symbol) })
      try {
        const locus = await resolveGene(symbol)
        // prefer the knownCanonical CDS model that backs the alignment so the
        // connected feature shares its coordinate space; fall back to RefSeq
        // Select for genes outside the 100-way set
        const transcript =
          (await fetchGeneCds(symbol)) ?? (await fetchTranscript(locus))
        // the alignment slice is hosted separately; treat it as optional so the
        // genome view still works before/without it
        const msa = await fetchGeneMsa(symbol).catch(() => undefined)
        if (latestPick.current === pickId) {
          setResult({ transcript, uniprotId: locus.uniprotId, msa })
        }
      } catch (e) {
        if (latestPick.current === pickId) {
          setError(e instanceof Error ? e.message : String(e))
        }
      } finally {
        if (latestPick.current === pickId) {
          setBusy(false)
        }
      }
    }
  }

  // Push the picked gene into the page URL (?gene=) so the selection is
  // shareable, bookmarkable, and survives reload — then fetch it.
  function navigate(symbol: string | null) {
    if (symbol) {
      const next = new URL(window.location.href)
      next.searchParams.set('gene', symbol)
      window.history.pushState(null, '', next)
      void onPick(symbol)
    }
  }

  // Drive picks from the URL: once on mount (deep link / reload) and on every
  // back/forward navigation. onPick is stable (only touches setState + refs).
  useEffect(() => {
    function syncFromUrl() {
      const symbol = new URLSearchParams(window.location.search).get('gene')
      if (symbol) {
        void onPick(symbol)
      }
    }
    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => {
      window.removeEventListener('popstate', syncFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <Box>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Autocomplete
            freeSolo
            sx={{ width: 320 }}
            options={options}
            onInputChange={(_e, v) => {
              void onSearch(v)
            }}
            onChange={(_e, v) => {
              navigate(typeof v === 'string' ? v : null)
            }}
            renderInput={params => (
              <TextField
                {...params}
                label="Gene symbol"
                placeholder="e.g. TP53"
                size="small"
              />
            )}
          />
          {busy ? <CircularProgress size={24} /> : null}
          <Typography variant="body2" color="text.secondary">
            Try:{' '}
            {EXAMPLES.map((g, i) => (
              <span key={g.symbol}>
                {i > 0 ? ', ' : ''}
                <Link
                  component="button"
                  type="button"
                  onClick={() => {
                    navigate(g.symbol)
                  }}
                >
                  {g.symbol}
                </Link>
              </span>
            ))}
          </Typography>
        </Stack>

        {picked?.note ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>{picked.symbol}</strong> — {picked.note}
          </Typography>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}

        {result ? <ResultPanel result={result} /> : null}
      </Box>
    </ThemeProvider>
  )
}

function ResultPanel({ result }: { result: Result }) {
  const { transcript, uniprotId, msa } = result
  const exons = exonBp(transcript)
  const span = genomicSpanBp(transcript)
  const ratio = (span / exons).toFixed(1)
  const [showDetails, setShowDetails] = useState(false)
  // launch the genome view with introns squeezed out (default) vs. the whole
  // gene; recomputes the loc/url/session spec below
  const [collapse, setCollapse] = useState(true)
  // the message currently shown in the "copied" toast (undefined = hidden)
  const [copied, setCopied] = useState<string>()
  const { url, spec } = useMemo(
    () =>
      buildSessionSpec({
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
  const specJson = JSON.stringify(spec, null, 2)

  function copy(text: string, message: string) {
    void navigator.clipboard.writeText(text)
    setCopied(message)
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          label={`${transcript.geneName} · ${transcript.name}`}
          color="primary"
        />
        <Chip
          label={`${transcript.refName} ${transcript.strand === 1 ? '+' : '−'}`}
          variant="outlined"
        />
        <Chip label={`${transcript.exons.length} exons`} variant="outlined" />
        {msa ? (
          <Chip
            label={`${msa.rowCount}-species alignment`}
            color="success"
            variant="outlined"
          />
        ) : null}
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 2 }}
        flexWrap="wrap"
        useFlexGap
      >
        <Button variant="contained" href={url} target="_blank" rel="noopener">
          Open in JBrowse ↗
        </Button>
        <FormControlLabel
          control={
            <Checkbox
              checked={collapse}
              onChange={event => {
                setCollapse(event.target.checked)
              }}
            />
          }
          label={`Collapse introns (±${DEFAULT_WINDOW_SIZE}bp around exons)`}
        />
        <Button
          size="small"
          onClick={() => {
            setShowDetails(v => !v)
          }}
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </Button>
      </Stack>

      {showDetails ? (
        <Box sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`${exons.toLocaleString()} exon bp / ${span.toLocaleString()} bp span (${ratio}× collapsed)`}
              size="small"
              variant="outlined"
            />
            {uniprotId ? (
              <Chip
                label={`UniProt ${uniprotId}`}
                size="small"
                variant="outlined"
              />
            ) : null}
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
                copy(specJson, 'Session JSON copied')
              }}
            >
              Copy session JSON
            </Button>
          </Stack>
          <Paper
            variant="outlined"
            sx={{ p: 1.5, mt: 1, overflowX: 'auto', bgcolor: 'action.hover' }}
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
              mt: 1,
              p: 1.5,
              maxHeight: 280,
              overflow: 'auto',
              fontSize: 11,
              fontFamily: 'monospace',
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            {specJson}
          </Box>
        </Box>
      ) : null}

      <Snackbar
        open={!!copied}
        autoHideDuration={2000}
        onClose={() => {
          setCopied(undefined)
        }}
        message={copied}
      />

      {msa ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            100-way alignment (live preview)
          </Typography>
          <Box sx={{ border: '1px solid var(--border)', borderRadius: 1 }}>
            <MSAViewer
              key={transcript.name}
              msa={msa.fasta}
              colorScheme="clustalx_protein_dynamic"
              height={340}
            />
          </Box>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          No 100-way alignment for {transcript.geneName} — it isn&apos;t in the
          UCSC knownCanonical set. The collapsed genome view (and its JBrowse
          link) still work.
        </Alert>
      )}
    </Box>
  )
}
