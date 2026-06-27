import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { MSAViewer } from 'react-msaview'

import {
  buildSessionSpec,
  collapsedLoc,
  exonBp,
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
  loc: string
  url: string
  spec: unknown
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
    }
  }

  async function onPick(symbol: string | null) {
    if (symbol) {
      setBusy(true)
      setError(undefined)
      setResult(undefined)
      setPicked({ symbol, note: NOTE_BY_SYMBOL.get(symbol) })
      try {
        const locus = await resolveGene(symbol)
        const transcript = await fetchTranscript(locus)
        // the alignment slice is hosted separately; treat it as optional so the
        // genome view still works before/without it
        const msa = await fetchGeneMsa(transcript).catch(() => undefined)
        const proteinSequence = msa?.fasta
          ? degap(firstSeq(msa.fasta))
          : undefined
        const { url, spec } = buildSessionSpec({
          transcript,
          uniprotId: locus.uniprotId,
          proteinSequence,
          msaAvailable: !!msa,
        })
        setResult({
          transcript,
          uniprotId: locus.uniprotId,
          msa,
          loc: collapsedLoc(transcript),
          url,
          spec,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(false)
      }
    }
  }

  return (
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
            void onPick(typeof v === 'string' ? v : null)
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
                  void onPick(g.symbol)
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
  )
}

function ResultPanel({ result }: { result: Result }) {
  const { transcript, uniprotId, msa, loc, url } = result
  const exons = exonBp(transcript)
  const span = genomicSpanBp(transcript)
  const ratio = (span / exons).toFixed(1)
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
        <Chip
          label={`${exons.toLocaleString()} exon bp / ${span.toLocaleString()} bp span (${ratio}× collapsed)`}
          variant="outlined"
        />
        {uniprotId ? (
          <Chip label={`UniProt ${uniprotId}`} variant="outlined" />
        ) : null}
        {msa ? (
          <Chip
            label={`${msa.rowCount}-species alignment`}
            color="success"
            variant="outlined"
          />
        ) : null}
      </Stack>

      <Button
        variant="contained"
        href={url}
        target="_blank"
        rel="noopener"
        sx={{ mt: 2 }}
      >
        Open in JBrowse ↗
      </Button>
      <Typography
        variant="caption"
        display="block"
        color="text.secondary"
        sx={{ mt: 0.5 }}
      >
        Opens a connected session: collapsed-intron gene view
        {msa ? ' + alignment' : ''}
        {msa && uniprotId ? ' + AlphaFold structure' : ''}.
      </Typography>

      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        Collapsed-intron regions ({transcript.exons.length} exons, introns
        removed)
      </Typography>
      <Paper
        variant="outlined"
        sx={{ p: 1.5, mt: 0.5, overflowX: 'auto', bgcolor: 'action.hover' }}
      >
        <Box
          component="code"
          sx={{ fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre' }}
        >
          {loc}
        </Box>
      </Paper>

      {msa ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            100-way alignment (live preview)
          </Typography>
          <Box sx={{ border: '1px solid var(--border)', borderRadius: 1 }}>
            <MSAViewer
              msa={msa.fasta}
              colorScheme="clustalx_protein_dynamic"
              height={340}
            />
          </Box>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          The 100-way alignment preview will appear once the alignment file is
          hosted (see scripts/gene-explorer). The genome view link above works
          now.
        </Alert>
      )}
    </Box>
  )
}

function firstSeq(fasta: string) {
  const blocks = fasta.split('>').filter(Boolean)
  const lines = (blocks[0] ?? '').split('\n')
  return lines.slice(1).join('')
}

function degap(seq: string) {
  return seq.replaceAll('-', '')
}
