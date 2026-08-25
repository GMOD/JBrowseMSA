import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { ThemeProvider } from '@mui/material/styles'

import {
  DEFAULT_WINDOW_SIZE,
  TREE_URI,
  buildSession,
  clinvarTrack,
  collapsedLoc,
  geneStats,
  loadGene,
  searchGenes,
  sessionUrl,
} from '../lib/geneExplorer'
import { fetchOrthologSymbol } from '../lib/orthologLookup'
import { buildOrthologMsa } from '../lib/orthologMsa'
import { fetchProteinStl } from '../lib/proteinStl'
import { DEFAULT_SPECIES, SPECIES, speciesByTaxId } from '../lib/speciesGenes'
import { theme } from '../lib/theme'

import type {
  GeneResult,
  InlineMsa,
  Session,
  Transcript,
} from '../lib/geneExplorer'
import type { Species } from '../lib/speciesGenes'
import type { ReactNode } from 'react'

const AlignmentPreview = lazy(() => import('./AlignmentPreview'))

// Copy text to the clipboard, exposing a transient message for a Snackbar. A
// success shows the caller's message; a rejected write (insecure context or
// denied permission) shows a failure notice rather than a false confirmation.
function useCopy() {
  const [message, setMessage] = useState<string>()
  const copy = (text: string, successMessage: string) =>
    navigator.clipboard.writeText(text).then(
      () => {
        setMessage(successMessage)
      },
      () => {
        setMessage('Copy failed — clipboard access was blocked')
      },
    )
  const dismiss = () => {
    setMessage(undefined)
  }
  return { copy, message, dismiss }
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

// The launch URL for a session snapshot. Encoding is async (deflate), so the
// link is empty for the tick it takes; the ignore flag keeps a slow encode of a
// superseded session from landing on the newer one.
function useSessionUrl(session: Session) {
  const [state, setState] = useState<{ session: Session; url: string }>()
  useEffect(() => {
    let ignore = false
    sessionUrl(session).then(
      url => {
        if (!ignore) {
          setState({ session, url })
        }
      },
      (e: unknown) => {
        console.error(e)
      },
    )
    return () => {
      ignore = true
    }
  }, [session])
  return state?.session === session ? state.url : undefined
}

interface Example {
  symbol: string
  note: string
}

// Curated per species. Human picks all sit in the 100-way index and span tumour
// suppressors, drug targets, disease genes, and size extremes (tiny HBB vs.
// titin). The others are textbook genes for each organism, chosen to resolve in
// NCBI and carry an AlphaFold structure.
const EXAMPLES_BY_TAXON: Record<number, Example[]> = {
  9606: [
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
  ],
  10090: [
    { symbol: 'Trp53', note: 'p53 tumour suppressor — the mouse orthologue' },
    { symbol: 'Shh', note: 'Sonic hedgehog — limb and neural patterning' },
    { symbol: 'Brca1', note: 'Breast-cancer susceptibility gene' },
    { symbol: 'Mecp2', note: 'Rett syndrome — X-linked chromatin regulator' },
    { symbol: 'Pax6', note: 'Master eye-development transcription factor' },
    { symbol: 'Cftr', note: 'Cystic fibrosis chloride channel' },
  ],
  7955: [
    {
      symbol: 'shha',
      note: 'Sonic hedgehog a — fin and floor-plate signalling',
    },
    { symbol: 'pax6a', note: 'Eye-development transcription factor' },
    { symbol: 'tp53', note: 'p53 tumour suppressor' },
    { symbol: 'myca', note: 'MYC proto-oncogene a' },
    { symbol: 'sox2', note: 'Stem-cell / neural transcription factor' },
  ],
  7227: [
    { symbol: 'Antp', note: 'Antennapedia — Hox homeotic gene' },
    { symbol: 'Ubx', note: 'Ultrabithorax — Hox gene' },
    { symbol: 'wg', note: 'wingless — founding Wnt ligand' },
    { symbol: 'N', note: 'Notch — receptor of the Notch pathway' },
    { symbol: 'dpp', note: 'decapentaplegic — a BMP morphogen' },
    { symbol: 'w', note: 'white — the classic eye-colour gene' },
  ],
  6239: [
    { symbol: 'lin-12', note: 'Notch-family receptor — cell-fate decisions' },
    { symbol: 'unc-54', note: 'Muscle myosin heavy chain' },
    { symbol: 'daf-16', note: 'FOXO transcription factor — lifespan' },
    { symbol: 'let-60', note: 'Ras orthologue — vulval induction' },
  ],
  3702: [
    { symbol: 'AG', note: 'AGAMOUS — floral organ identity (MADS-box)' },
    { symbol: 'LFY', note: 'LEAFY — floral meristem identity' },
    { symbol: 'AP1', note: 'APETALA1 — floral organ identity' },
    { symbol: 'CO', note: 'CONSTANS — photoperiodic flowering' },
    { symbol: 'PHYB', note: 'Phytochrome B — red-light photoreceptor' },
  ],
  559292: [
    {
      symbol: 'CDC28',
      note: 'Cyclin-dependent kinase — the cell-cycle engine',
    },
    { symbol: 'ACT1', note: 'Actin — highly conserved cytoskeleton' },
    { symbol: 'GAL4', note: 'Transcriptional activator (two-hybrid fame)' },
    { symbol: 'RAD51', note: 'Homologous-recombination recombinase' },
    { symbol: 'TUB1', note: 'Alpha-tubulin' },
  ],
}

function examplesFor(species: Species): Example[] {
  return EXAMPLES_BY_TAXON[species.taxId] ?? []
}

function subscribeGeneUrl(cb: () => void) {
  window.addEventListener('popstate', cb)
  window.addEventListener('gene-url-change', cb)
  return () => {
    window.removeEventListener('popstate', cb)
    window.removeEventListener('gene-url-change', cb)
  }
}

// The whole query string — a stable snapshot for useSyncExternalStore (returning
// a fresh object each read would loop). The component parses gene + species out.
function getSearchString() {
  return window.location.search
}

interface UrlState {
  gene: string | null
  species: Species
}

function parseUrl(search: string): UrlState {
  const params = new URLSearchParams(search)
  const taxon = Number(params.get('taxon'))
  return {
    gene: params.get('gene'),
    species: speciesByTaxId(taxon) ?? DEFAULT_SPECIES,
  }
}

// Debounced, race-safe gene-symbol type-ahead. Only user keystrokes feed `query`
// (selecting a gene resets the input to the full symbol, which shouldn't re-search
// what we just resolved), so suggestions stay a pure function of what was typed;
// the cleanup drops a slow earlier response so it can't clobber a newer one.
function useGeneSuggestions(query: string, species: Species) {
  const [hits, setHits] = useState<string[]>([])
  useEffect(() => {
    if (query.length < 2) {
      return
    }
    let ignore = false
    const timer = setTimeout(() => {
      searchGenes(query, species)
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
  }, [query, species])
  return hits
}

interface GeneOutcome {
  symbol: string | null // the gene this result/error describes
  taxId: number | null // the species it was loaded for
  result?: GeneResult
  error?: string
}

// Load everything the result panel renders for the gene named in the URL. The
// only stored state is the last completed outcome; `busy` is DERIVED — we're
// loading whenever the URL's gene isn't the one the outcome describes — so no
// flag has to be kept in sync with a setState inside the effect. The effect just
// fetches; the ignore flag makes switching genes race-safe.
// https://react.dev/learn/you-might-not-need-an-effect
function useGene(symbol: string | null, species: Species) {
  const [outcome, setOutcome] = useState<GeneOutcome>({
    symbol: null,
    taxId: null,
  })
  useEffect(() => {
    if (!symbol) {
      return
    }
    let ignore = false
    loadGene(symbol, species).then(
      result => {
        if (!ignore) {
          setOutcome({ symbol, taxId: species.taxId, result })
        }
      },
      (e: unknown) => {
        if (!ignore) {
          setOutcome({
            symbol,
            taxId: species.taxId,
            error: e instanceof Error ? e.message : String(e),
          })
        }
      },
    )
    return () => {
      ignore = true
    }
  }, [symbol, species])

  const isCurrent = outcome.symbol === symbol && outcome.taxId === species.taxId
  return {
    busy: symbol !== null && !isCurrent,
    // keep the previous result as a stable placeholder while the next loads (the
    // caller dims it); never surface an error for a gene the URL has left
    result: outcome.result,
    error: isCurrent ? outcome.error : undefined,
  }
}

export default function GeneExplorer() {
  // Reactive URL read: re-renders on popstate (back/forward) and on the
  // gene-url-change event dispatched by navigate() below. The gene AND the
  // species both live in the URL so a picked example is fully shareable.
  const search = useSyncExternalStore(
    subscribeGeneUrl,
    getSearchString,
    () => '',
  )
  const { gene: urlGene, species } = useMemo(() => parseUrl(search), [search])

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

  const hits = useGeneSuggestions(searchTerm, species)
  const { busy, result, error } = useGene(urlGene, species)

  const exampleSymbols = examplesFor(species).map(e => e.symbol)
  // show the curated examples until there's a real query to suggest against
  const options = searchTerm.length >= 2 ? hits : exampleSymbols

  // Reflect the gene + species in the page URL so it's shareable, bookmarkable,
  // and survives reload; clearing the Autocomplete removes the gene but keeps the
  // species. taxon is omitted for human, keeping human links clean.
  function navigate(symbol: string | null, taxId: number) {
    const next = new URL(window.location.href)
    if (symbol) {
      next.searchParams.set('gene', symbol)
    } else {
      next.searchParams.delete('gene')
    }
    if (taxId === DEFAULT_SPECIES.taxId) {
      next.searchParams.delete('taxon')
    } else {
      next.searchParams.set('taxon', String(taxId))
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
          species={species}
          onSpeciesChange={taxId => {
            // symbols don't carry across organisms, so the switch drops the
            // gene and resets the type-ahead, then follows NCBI's ortholog to
            // the new species when it has one. The URL is re-read before that
            // navigation lands so a slow answer can't override a later pick.
            setSearchTerm('')
            setInputValue('')
            navigate(null, taxId)
            if (urlGene && result?.geneId) {
              fetchOrthologSymbol(result.geneId, taxId)
                .then(symbol => {
                  const now = parseUrl(window.location.search)
                  if (symbol && !now.gene && now.species.taxId === taxId) {
                    navigate(symbol, taxId)
                  }
                })
                .catch(() => {})
            }
          }}
          onInputChange={(value, isKeystroke) => {
            setInputValue(value)
            // only a keystroke should drive a new type-ahead query; the 'reset'
            // fired when a gene is selected would re-search its full symbol
            if (isKeystroke) {
              setSearchTerm(value)
            }
          }}
          onSelect={symbol => {
            navigate(symbol, species.taxId)
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

// Left column: a species picker, gene-symbol type-ahead, the curated Example
// chips, and a note for the current gene. Purely presentational — all state
// lives in GeneExplorer.
function GeneSearchPanel({
  inputValue,
  options,
  busy,
  urlGene,
  species,
  onSpeciesChange,
  onInputChange,
  onSelect,
  onOpenHelp,
}: {
  inputValue: string
  options: string[]
  busy: boolean
  urlGene: string | null
  species: Species
  onSpeciesChange: (taxId: number) => void
  // isKeystroke distinguishes typing (drives the type-ahead) from the 'reset'
  // that fires when a value is selected
  onInputChange: (value: string, isKeystroke: boolean) => void
  onSelect: (symbol: string | null) => void
  onOpenHelp: () => void
}) {
  const examples = examplesFor(species)
  const noteBySymbol = new Map(examples.map(e => [e.symbol, e.note]))
  const urlGeneNote = urlGene ? noteBySymbol.get(urlGene) : undefined
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

      <TextField
        select
        fullWidth
        size="small"
        label="Species"
        value={species.taxId}
        onChange={event => {
          onSpeciesChange(Number(event.target.value))
        }}
        sx={{ mb: 2 }}
      >
        {SPECIES.map(s => (
          <MenuItem key={s.taxId} value={s.taxId}>
            {s.label}
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{ ml: 1, fontStyle: 'italic' }}
            >
              {s.scientificName}
            </Typography>
          </MenuItem>
        ))}
      </TextField>

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
              <GeneOption symbol={option} note={noteBySymbol.get(option)} />
            </li>
          )
        }}
        renderInput={params => (
          <TextField
            {...params}
            label="Gene symbol"
            placeholder={
              examples[0] ? `e.g. ${examples[0].symbol}` : 'e.g. TP53'
            }
            helperText={`Type any ${species.label} gene, or pick below`}
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
        {examples.map(ex => (
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
function GeneOption({ symbol, note }: { symbol: string; note?: string }) {
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
      {urlGene ? null : (
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 220,
            p: 3,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">
            Pick a species, then search for a gene or choose an example to build
            a connected JBrowse session — a collapsed-intron genome view, its
            protein alignment across species, and the AlphaFold structure.
          </Typography>
        </Paper>
      )}
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
          <ResultPanel
            key={`${result.species.taxId}:${urlGene}`}
            result={result}
          />
        </Box>
      ) : null}
    </Box>
  )
}

function ResultPanel({ result }: { result: GeneResult }) {
  const {
    species,
    transcript,
    uniprotId,
    geneId,
    msa,
    proteinSequence,
    assemblyAccession,
  } = result
  const { codingBp, span, ratio } = geneStats(transcript)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // launch the genome view with introns squeezed out (default) vs. the whole
  // gene, reading 5'→3' (default for minus-strand genes), with conservation
  // under it; each recomputes the loc/url/session spec below
  const [collapse, setCollapse] = useState(true)
  const [flip, setFlip] = useState(transcript.strand === -1)
  const [conservation, setConservation] = useState(false)
  // a cross-species alignment built on demand (non-human); once present it's
  // folded into the launched session as a connected MsaView
  const [inlineMsa, setInlineMsa] = useState<InlineMsa>()
  const session = useMemo(
    () =>
      buildSession({
        transcript,
        uniprotId,
        proteinSequence,
        msaAvailable: !!msa,
        inlineMsa,
        collapseIntrons: collapse,
        flip,
        conservation,
        assemblyAccession,
      }),
    [
      transcript,
      uniprotId,
      msa,
      proteinSequence,
      inlineMsa,
      collapse,
      flip,
      conservation,
      assemblyAccession,
    ],
  )
  const url = useSessionUrl(session)
  const loc = useMemo(
    () => collapsedLoc(transcript, { collapse, flip }),
    [transcript, collapse, flip],
  )
  const sessionJson = useMemo(() => JSON.stringify(session, null, 2), [session])

  // human uses the hosted hg38 assembly; non-human embeds its GenArk accession
  const assemblyLabel = assemblyAccession ?? 'hg38'
  const alignRows = inlineMsa?.rowCount ?? msa?.rowCount
  const stats = [
    `${transcript.cds.length} coding exons`,
    `${codingBp.toLocaleString()} bp CDS`,
    `${ratio}× collapsed`,
    alignRows ? `${alignRows}-species alignment` : undefined,
    uniprotId ? 'AlphaFold structure' : undefined,
  ].filter((s): s is string => !!s)

  // build the cross-species alignment on demand (non-human): resolve orthologs,
  // fetch proteins, align at EBI, then fold the result into the session
  const [aligning, setAligning] = useState(false)
  const [alignStatus, setAlignStatus] = useState<string>()
  const [alignError, setAlignError] = useState<string>()
  function buildAlignment() {
    if (geneId && proteinSequence) {
      setAligning(true)
      setAlignError(undefined)
      buildOrthologMsa(geneId, species.taxId, proteinSequence, setAlignStatus)
        .then(setInlineMsa)
        .catch((e: unknown) => {
          setAlignError(e instanceof Error ? e.message : String(e))
        })
        .finally(() => {
          setAligning(false)
        })
    }
  }
  // non-human genes can offer an on-demand alignment once a query protein exists
  const canBuildAlignment = !msa && !!geneId && !!proteinSequence

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Typography variant="h6" component="h2" sx={{ mb: 0.25 }}>
        {transcript.geneName}{' '}
        <Typography component="span" variant="body2" color="text.secondary">
          {transcript.name}
        </Typography>
      </Typography>
      <Typography variant="body2" color="text.secondary">
        <Box component="span" sx={{ fontStyle: 'italic' }}>
          {species.scientificName}
        </Box>{' '}
        · {assemblyLabel} · {transcript.refName}{' '}
        {transcript.strand === 1 ? '+' : '−'}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5 }}>
        {stats.map(s => (
          <Chip key={s} label={s} size="small" variant="outlined" />
        ))}
      </Box>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
        <Button
          variant="contained"
          component="a"
          href={url}
          disabled={!url}
          target="_blank"
          rel="noopener"
          aria-label="Open in JBrowse (opens in a new tab)"
        >
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
      <ViewOptions
        transcript={transcript}
        human={!!species.humanFastPath}
        collapse={collapse}
        onCollapse={setCollapse}
        flip={flip}
        onFlip={setFlip}
        conservation={conservation}
        onConservation={setConservation}
      />
      {msa ? <PreviewAlignment msa={msa.fasta} /> : null}

      {species.humanFastPath && !msa ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No 100-way alignment for {transcript.geneName} — it isn&apos;t in the
          UCSC knownCanonical set. The collapsed genome view
          {uniprotId ? ' and AlphaFold structure' : ''} (and the JBrowse link)
          still work.
        </Alert>
      ) : null}
      {canBuildAlignment ? (
        <Box sx={{ mt: 2 }}>
          {inlineMsa ? (
            <Alert severity="success">
              Cross-species alignment ready — {alignRows} species. It&apos;s now
              part of the session; open it in JBrowse.
            </Alert>
          ) : (
            <>
              <Button
                variant="outlined"
                size="small"
                disabled={aligning}
                startIcon={
                  aligning ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : null
                }
                onClick={() => {
                  buildAlignment()
                }}
              >
                {aligning
                  ? 'Building alignment…'
                  : 'Build cross-species alignment'}
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                {aligning && alignStatus
                  ? alignStatus
                  : `Aligns ${species.label} orthologs across species live via NCBI + EBI (can take a minute), then adds a connected alignment view to the session.`}
              </Typography>
            </>
          )}
          {alignError ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Couldn&apos;t build the alignment: {alignError}
            </Alert>
          ) : null}
        </Box>
      ) : null}

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
        geneName={transcript.geneName}
      />
    </Paper>
  )
}

// The checkboxes that shape the launched genome view. The flip only makes
// sense for a minus-strand gene, and the track options only where the hosted
// hg38 config has the tracks.
function ViewOptions({
  transcript,
  human,
  collapse,
  onCollapse,
  flip,
  onFlip,
  conservation,
  onConservation,
}: {
  transcript: Transcript
  human: boolean
  collapse: boolean
  onCollapse: (v: boolean) => void
  flip: boolean
  onFlip: (v: boolean) => void
  conservation: boolean
  onConservation: (v: boolean) => void
}) {
  const clinvar = human ? clinvarTrack(transcript.geneName) : undefined
  return (
    <Box sx={{ mt: 0.5, ml: -0.5 }}>
      <OptionCheckbox
        checked={collapse}
        onChange={onCollapse}
        label={`Collapse introns (±${DEFAULT_WINDOW_SIZE} bp around exons)`}
      />
      {transcript.strand === -1 ? (
        <OptionCheckbox
          checked={flip}
          onChange={onFlip}
          label="Read 5′→3′ (flip the minus-strand gene)"
        />
      ) : null}
      {human ? (
        <OptionCheckbox
          checked={conservation}
          onChange={onConservation}
          label="Show 470-way conservation track"
        />
      ) : null}
      {clinvar ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', ml: 0.5 }}
        >
          Includes the ClinVar pathogenic variants track for{' '}
          {transcript.geneName}.
        </Typography>
      ) : null}
    </Box>
  )
}

function OptionCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <FormControlLabel
      sx={{ display: 'flex' }}
      control={
        <Checkbox
          size="small"
          checked={checked}
          onChange={event => {
            onChange(event.target.checked)
          }}
        />
      }
      label={label}
    />
  )
}

// matchMedia is missing under jsdom, where every viewport counts as desktop
const desktopMedia = () =>
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 641px)')
    : undefined
function subscribeDesktop(cb: () => void) {
  const query = desktopMedia()
  query?.addEventListener('change', cb)
  return () => {
    query?.removeEventListener('change', cb)
  }
}

// The alignment the session will open, previewed in place. Behind a disclosure
// and desktop-only, so the viewer bundle is only fetched when someone asks.
function PreviewAlignment({ msa }: { msa: string }) {
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    () => desktopMedia()?.matches ?? true,
    () => false,
  )
  const [open, setOpen] = useState(false)
  if (!desktop) {
    return null
  }
  return (
    <Box sx={{ mt: 1.5 }}>
      <Button
        size="small"
        variant="text"
        onClick={() => {
          setOpen(!open)
        }}
      >
        {open ? 'Hide alignment preview' : 'Preview alignment'}
      </Button>
      {open ? (
        <Box sx={{ mt: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Suspense fallback={<Box sx={{ height: 300 }} />}>
            <AlignmentPreview msa={msa} treeUri={TREE_URI} />
          </Suspense>
        </Box>
      ) : null}
    </Box>
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
  geneName,
}: {
  open: boolean
  onClose: () => void
  loc: string
  sessionJson: string
  codingBp: number
  span: number
  ratio: string
  uniprotId: string | undefined
  geneName: string
}) {
  const { copy, message: copyMessage, dismiss: dismissCopy } = useCopy()
  // STL export runs on click (fetch AlphaFold + build mesh), so it's a plain
  // async handler — busy drives the spinner, stlError surfaces failures.
  const [stlBusy, setStlBusy] = useState(false)
  const [stlError, setStlError] = useState<string>()

  function downloadStl(accession: string) {
    setStlBusy(true)
    fetchProteinStl(accession)
      .then(bytes => {
        triggerDownload(bytes, `${geneName}-${accession}.stl`)
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
              void copy(window.location.href, 'Page link copied')
            }}
          >
            Copy page link
          </Button>
          <Button
            size="small"
            onClick={() => {
              void copy(sessionJson, 'Session JSON copied')
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
      <Snackbar
        open={!!copyMessage}
        autoHideDuration={2000}
        onClose={() => {
          dismissCopy()
        }}
        message={copyMessage}
      />
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
  const { copy, message: copyMessage, dismiss: dismissCopy } = useCopy()
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
            <Code>gene_table</Code>. The genome itself comes from the{' '}
            <strong>UCSC GenArk</strong> 2bit on genomes.jbrowse.org, embedded
            straight into the session — no config change needed.
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            The <strong>AlphaFold</strong> structure is fetched by UniProt
            accession. The alignment is the hosted 100-way for human, or —
            outside human — built on demand from NCBI orthologs aligned at{' '}
            <strong>EBI Clustal Omega</strong> and carried inline in the
            session.
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
              void copy(BUILD_SNIPPET, 'Snippet copied')
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
      <Snackbar
        open={!!copyMessage}
        autoHideDuration={2000}
        onClose={() => {
          dismissCopy()
        }}
        message={copyMessage}
      />
    </Dialog>
  )
}
