import {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

import HelpOutlineIcon from '@mui/icons-material/HelpOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { ThemeProvider } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import { examplesFor } from '../lib/geneExamples'
import {
  DEFAULT_WINDOW_SIZE,
  TREE_URI,
  buildSession,
  clinvarTrack,
  geneStats,
  loadGene,
  searchGenes,
  sessionUrl,
} from '../lib/geneExplorer'
import { fetchOrthologSymbol } from '../lib/orthologLookup'
import { DEFAULT_SPECIES, SPECIES, speciesByTaxId } from '../lib/speciesGenes'
import { theme } from '../lib/theme'
import { HelpDialog, SessionDetailsDialog } from './GeneExplorerDialogs'

import type { Example } from '../lib/geneExamples'
import type {
  GeneResult,
  Genome,
  Session,
  Transcript,
} from '../lib/geneExplorer'
import type { Species } from '../lib/speciesGenes'

const AlignmentPreview = lazy(() => import('./AlignmentPreview'))

// The launch URL for a session snapshot. Encoding is async (deflate), so the
// link is empty for the tick it takes; the ignore flag keeps a slow encode of a
// superseded session from landing on the newer one.
function useSessionUrl(session: Session, genome: Genome) {
  const [state, setState] = useState<{ session: Session; url: string }>()
  useEffect(() => {
    let ignore = false
    sessionUrl(session, genome).then(
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
  }, [session, genome])
  return state?.session === session ? state.url : undefined
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
// only stored state is the last completed outcome (plus the load's latest
// progress line); `busy` is DERIVED — we're loading whenever the URL's gene
// isn't the one the outcome describes — so no flag has to be kept in sync with
// a setState inside the effect. The effect just fetches; the ignore flag makes
// switching genes race-safe.
// https://react.dev/learn/you-might-not-need-an-effect
function useGene(symbol: string | null, species: Species) {
  const [outcome, setOutcome] = useState<GeneOutcome>({
    symbol: null,
    taxId: null,
  })
  const [progress, setProgress] = useState<string>()
  useEffect(() => {
    if (!symbol) {
      return
    }
    let ignore = false
    setProgress(undefined)
    loadGene(symbol, species, message => {
      if (!ignore) {
        setProgress(message)
      }
    }).then(
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
  const busy = symbol !== null && !isCurrent
  return {
    busy,
    progress: busy ? progress : undefined,
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
  const { busy, progress, result, error } = useGene(urlGene, species)

  const examples = examplesFor(species)
  // show the curated examples until there's a real query to suggest against
  const options = searchTerm.length >= 2 ? hits : examples.map(e => e.symbol)

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

  // Symbols don't carry across organisms, so the switch drops the gene and
  // resets the type-ahead, then follows NCBI's ortholog to the new species when
  // it has one. The URL is re-read before that navigation lands so a slow answer
  // can't override a later pick.
  function switchSpecies(taxId: number) {
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
  }

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'flex-start',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <GeneSearchPanel
          inputValue={inputValue}
          options={options}
          examples={examples}
          busy={busy}
          urlGene={urlGene}
          species={species}
          onSpeciesChange={switchSpecies}
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
          progress={progress}
        />
      </Box>

      {urlGene && result?.msa ? (
        <AlignmentPreviewPanel
          // MSAViewer builds its model from the props it first mounts with, so
          // a new gene needs a new instance, not a new msa prop
          key={`${result.species.taxId}:${result.transcript.geneName}`}
          msa={result.msa.fasta}
          busy={busy}
        />
      ) : null}

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
  examples,
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
  examples: Example[]
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
              // spread params.slotProps, not just its `input`: this prop
              // replaces the one `{...params}` supplied, and dropping the rest
              // takes `htmlInput` with it — the slot carrying the ref and value
              // Autocomplete drives the field through
              ...params.slotProps,
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
  progress,
}: {
  urlGene: string | null
  error: string | undefined
  result: GeneResult | undefined
  busy: boolean
  progress: string | undefined
}) {
  if (!urlGene) {
    return (
      <Box sx={{ flex: 1, minWidth: 0 }}>
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
          <Typography variant="body2" sx={{ maxWidth: 560 }}>
            Pick a species, then search for a gene or choose an example to build
            a connected JBrowse session — a collapsed-intron genome view, its
            protein alignment across species, and the AlphaFold structure.
          </Typography>
        </Paper>
      </Box>
    )
  }
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {progress ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 1 }}
        >
          {progress}
        </Typography>
      ) : null}
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
    genome,
    transcript,
    uniprotId,
    geneId,
    msa,
    proteinSequence,
  } = result
  const { codingBp, ratio } = geneStats(transcript)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // launch the genome view with introns squeezed out (default) vs. the whole
  // gene, reading 5'→3' (default for minus-strand genes), with conservation
  // under it; each recomputes the session spec below
  const [collapse, setCollapse] = useState(true)
  const [flip, setFlip] = useState(transcript.strand === -1)
  const [conservation, setConservation] = useState(false)
  // non-human genes with a query protein can carry a connected MsaView that the
  // plugin fills from NCBI orthologs when the session opens
  const canAlignOrthologs =
    !species.humanFastPath && !msa && !!geneId && !!proteinSequence
  const [includeOrthologs, setIncludeOrthologs] = useState(true)
  const orthologs = canAlignOrthologs && includeOrthologs
  // every buildSession input except the four view toggles comes off `result`,
  // so it is the only other dep — the session object has to stay referentially
  // stable or useSessionUrl re-encodes on every render
  const session = useMemo(
    () =>
      buildSession({
        genome: result.genome,
        transcript: result.transcript,
        uniprotId: result.uniprotId,
        proteinSequence: result.proteinSequence,
        msaAvailable: !!result.msa,
        orthologs:
          orthologs && result.geneId && result.proteinSequence
            ? {
                taxId: result.species.taxId,
                geneId: result.geneId,
                proteinSequence: result.proteinSequence,
                source: result.species.orthologSource ?? 'ncbi',
              }
            : undefined,
        collapseIntrons: collapse,
        flip,
        conservation,
      }),
    [result, orthologs, collapse, flip, conservation],
  )
  const url = useSessionUrl(session, genome)

  const stats = [
    `${transcript.cds.length} coding exons`,
    `${codingBp.toLocaleString()} bp CDS`,
    `${ratio}× collapsed`,
    msa ? `${msa.rowCount}-species alignment` : undefined,
    orthologs ? 'ortholog alignment' : undefined,
    uniprotId ? 'AlphaFold structure' : undefined,
  ].filter((s): s is string => !!s)

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
        · {genome.assemblyName} · {transcript.refName}{' '}
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

      {species.humanFastPath && !msa ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No 100-way alignment for {transcript.geneName} — it isn&apos;t in the
          UCSC knownCanonical set. The collapsed genome view
          {uniprotId ? ' and AlphaFold structure' : ''} (and the JBrowse link)
          still work.
        </Alert>
      ) : null}
      {canAlignOrthologs ? (
        <>
          <FormControlLabel
            sx={{ ml: -0.5, display: 'flex' }}
            control={
              <Checkbox
                size="small"
                checked={includeOrthologs}
                onChange={event => {
                  setIncludeOrthologs(event.target.checked)
                }}
              />
            }
            label="Include cross-species alignment"
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: -0.5 }}
          >
            JBrowse builds it when the session opens:{' '}
            {species.orthologSource === 'panther' ? 'PANTHER' : 'NCBI'}&apos;s
            orthologs of {transcript.geneName}, aligned at EBI Clustal Omega,
            connected to the genome and structure.
          </Typography>
        </>
      ) : null}

      <SessionDetailsDialog
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
        }}
        transcript={transcript}
        session={session}
        collapse={collapse}
        flip={flip}
        uniprotId={uniprotId}
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

// The alignment the session will open, previewed in place. It gets its own row
// under the two columns because an alignment needs the whole page width to read.
// Behind a disclosure and desktop-only, so the viewer bundle is only fetched
// when someone asks. defaultMatches keeps jsdom (no matchMedia) on the desktop
// branch.
function AlignmentPreviewPanel({ msa, busy }: { msa: string; busy: boolean }) {
  const desktop = useMediaQuery('(min-width:641px)', { defaultMatches: true })
  const [open, setOpen] = useState(false)
  if (!desktop) {
    return null
  }
  return (
    <Box sx={{ mt: 2, opacity: busy ? 0.5 : 1, transition: 'opacity 0.2s' }}>
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
        <Paper variant="outlined" sx={{ mt: 1, overflow: 'hidden' }}>
          <Suspense fallback={<Box sx={{ height: 460 }} />}>
            <AlignmentPreview msa={msa} treeUri={TREE_URI} height={460} />
          </Suspense>
        </Paper>
      ) : null}
    </Box>
  )
}
