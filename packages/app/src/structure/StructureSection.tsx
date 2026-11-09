import { Suspense, lazy, useState } from 'react'

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { observer } from 'mobx-react'
import {
  accessionOfRowName,
  canFindStructures,
  identifiersOfRowName,
  paintableTracks,
  trackColorBy,
} from 'react-msaview-structure'

import CandidateButtons, { candidateKey } from './CandidateButtons'
import SuperpositionSummary from './SuperpositionSummary'
import { useFoldseekSearch } from './useFoldseekSearch'
import { useStructureLookup } from './useStructureLookup'
import { distanceTrackId, useSuperposition } from './useSuperposition'

import type { FitBy } from './useSuperposition'
import type { SxProps, Theme } from '@mui/material'
import type { MsaViewModel } from 'react-msaview'
import type { StructureCandidate } from 'react-msaview-structure'
import type {
  PolymerRepresentation,
  StructureColor,
} from 'react-msaview-structure/panel'

type SxList = Extract<SxProps<Theme>, readonly unknown[]>

function isSxList(sx: SxProps<Theme> | undefined): sx is SxList {
  return Array.isArray(sx)
}

// Mol* is a large chunk, so it loads when a structure first shows
const StructurePanel = lazy(() =>
  import('react-msaview-structure/panel').then(m => ({
    default: m.StructurePanel,
  })),
)

const row = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 1.5,
}

const StructureSection = observer(function StructureSection({
  model,
  panelHeight = 400,
  sx,
}: {
  model: MsaViewModel
  panelHeight?: number
  sx?: SxProps<Theme>
}) {
  const names = [...model.rowMap.keys()]
  const [chosen, setChosen] = useState<string | null>(null)
  const [accession, setAccession] = useState('')
  const [shown, setShown] = useState<string>()
  const [colorBy, setColorBy] = useState<StructureColor>('none')
  const [representation, setRepresentation] = useState<PolymerRepresentation>()
  const [fitBy, setFitBy] = useState<FitBy>('alignment')
  const { lookup, find, reset } = useStructureLookup(model)
  const { foldseek, search } = useFoldseekSearch(model)
  const { superposition, superpose, clear, setTmFits } = useSuperposition(model)

  if (names.length === 0) {
    return null
  }
  const current =
    (chosen && model.rowMap.has(chosen) ? chosen : undefined) ??
    model.clickedCell?.row ??
    names.find(n => canFindStructures(n)) ??
    names[0]!
  const mapped = [...new Set(model.mappedStructures.map(m => m.structure.id))]
  const structureId = shown && mapped.includes(shown) ? shown : mapped[0]
  const superposed =
    superposition.state === 'done' ? superposition.result : undefined
  const shownIds = superposed
    ? [superposed.referenceId, ...Object.keys(superposed.matrices)]
    : superposition.state === 'tm'
      ? superposition.ids
      : structureId
        ? [structureId]
        : []
  const withId = names.filter(n => canFindStructures(n))
  const typed = accession.trim()
  const noId =
    !typed &&
    !accessionOfRowName(current) &&
    identifiersOfRowName(current).length === 0
  const found = lookup.state === 'done' && lookup.row === current
  const lookupFailed = found && !!lookup.result.problem
  const showAccession = noId || lookupFailed || typed !== ''
  const tracks = paintableTracks(model)
  const paintBy =
    colorBy.startsWith('track:') &&
    !tracks.some(t => trackColorBy(t) === colorBy)
      ? 'none'
      : colorBy
  const fitShown =
    superposition.state === 'done' ||
    superposition.state === 'tm' ||
    model.columnTracks.some(t => t.id === distanceTrackId)

  function show(candidate: StructureCandidate) {
    const { mapping } = candidate
    if (superposition.state !== 'idle') {
      clear()
    }
    model.setResidueMappings([
      ...model.residueMappings.filter(
        m => candidateKey(m) !== candidateKey(mapping),
      ),
      mapping,
    ])
    setShown(mapping.structure.id)
  }

  return (
    <Box
      data-testid="structure"
      sx={[
        { border: 1, borderColor: 'divider', m: 2.5, p: 1.5 },
        ...(isSxList(sx) ? sx : sx === undefined ? [] : [sx]),
      ]}
    >
      <Box sx={row}>
        <Typography component="h2" sx={{ fontSize: 16, fontWeight: 600 }}>
          Structure
        </Typography>
        <Autocomplete
          size="small"
          sx={{ width: 260 }}
          options={names}
          value={current}
          disableClearable
          onChange={(_e, value) => {
            setChosen(value)
            reset()
          }}
          renderInput={params => <TextField {...params} label="Row" />}
        />
        {mapped.length > 1 ? (
          <Select
            size="small"
            value={structureId ?? ''}
            onChange={e => {
              setShown(e.target.value)
            }}
          >
            {mapped.map(id => (
              <MenuItem key={id} value={id}>
                {id}
              </MenuItem>
            ))}
          </Select>
        ) : null}
        {structureId ? (
          <>
            <Select
              size="small"
              value={paintBy}
              onChange={e => {
                setColorBy(e.target.value)
              }}
            >
              <MenuItem value="none">No coloring</MenuItem>
              <MenuItem value="conservation">Column conservation</MenuItem>
              <MenuItem value="scheme">Alignment colors</MenuItem>
              {tracks.map(t => (
                <MenuItem key={t.id} value={trackColorBy(t)}>
                  Track: {t.name}
                </MenuItem>
              ))}
            </Select>
            <Select
              size="small"
              value={representation ?? 'cartoon'}
              onChange={e => {
                setRepresentation(e.target.value)
              }}
            >
              <MenuItem value="cartoon">Cartoon</MenuItem>
              <MenuItem value="surface">Surface</MenuItem>
            </Select>
          </>
        ) : null}
      </Box>

      {noId ? (
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          {current} is not a database id. Type a UniProt accession, or search by
          sequence for similar folds.
        </Typography>
      ) : null}
      <Box sx={{ ...row, mt: 1 }}>
        <Button
          variant="contained"
          size="small"
          disableElevation
          disabled={lookup.state === 'loading' || (noId && !typed)}
          title="Looks the id up in UniProt, then finds the AlphaFold DB model and the PDB entries"
          onClick={() => {
            void find(current, accession)
          }}
        >
          Find structure
        </Button>
        {showAccession ? (
          <TextField
            size="small"
            label="UniProt accession"
            placeholder={accessionOfRowName(current) ?? 'P04637'}
            value={accession}
            onChange={e => {
              setAccession(e.target.value)
            }}
            sx={{ width: 170 }}
          />
        ) : null}
        {noId ? (
          <Button
            variant="contained"
            color="secondary"
            size="small"
            disabled={foldseek.state === 'running'}
            title={`Sends ${current}'s sequence to search.foldseek.com and waits for their queue. Finds proteins that fold like it, which need not be the same protein.`}
            onClick={() => {
              void search(current)
            }}
          >
            Search by sequence (Foldseek)
          </Button>
        ) : null}
        {withId.length > 1 ? (
          <>
            <Select
              size="small"
              value={fitBy}
              onChange={e => {
                setFitBy(e.target.value)
              }}
              title="What the fit uses"
            >
              <MenuItem value="alignment">Fit by alignment</MenuItem>
              <MenuItem value="tm-align">Fit by structure (TM-align)</MenuItem>
            </Select>
            <Button
              variant="contained"
              size="small"
              disabled={superposition.state === 'working'}
              onClick={() => {
                void superpose(withId, fitBy)
              }}
            >
              Superpose rows
            </Button>
            {fitShown ? (
              <Button
                variant="contained"
                size="small"
                color="inherit"
                disableElevation
                onClick={clear}
              >
                Clear
              </Button>
            ) : null}
          </>
        ) : null}
        {lookup.state === 'loading' ? <CircularProgress size={20} /> : null}
        {foldseek.state === 'running' ? (
          <Typography variant="body2">
            {foldseek.row}: {foldseek.message}…
          </Typography>
        ) : null}
        {superposition.state === 'working' ? (
          <Typography variant="body2">{superposition.message}…</Typography>
        ) : null}
      </Box>

      {foldseek.state === 'error' ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {foldseek.message}
        </Alert>
      ) : null}
      {foldseek.state === 'done' ? (
        foldseek.candidates.length > 0 ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption">
              Foldseek hits for {foldseek.row}: structural homologs, so a
              mapping is the alignment Foldseek made and not the same protein
            </Typography>
            <CandidateButtons
              candidates={foldseek.candidates}
              shownId={structureId}
              color="secondary"
              titleOf={c => `${c.mapping.row}: ${c.identity}`}
              onPick={show}
            />
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 1 }}>
            Foldseek found no hit it could map {foldseek.row} onto.
          </Alert>
        )
      ) : null}
      {lookup.state === 'error' && lookup.row === current ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {lookup.message}
        </Alert>
      ) : null}
      {lookupFailed ? (
        <Alert
          severity="warning"
          sx={{ mt: 1 }}
          action={
            <Button
              variant="contained"
              color="secondary"
              size="small"
              disabled={foldseek.state === 'running'}
              onClick={() => {
                void search(current)
              }}
            >
              Search by sequence
            </Button>
          }
        >
          {lookup.result.problem}
        </Alert>
      ) : null}
      {found && lookup.result.candidates.length > 0 ? (
        <CandidateButtons
          candidates={lookup.result.candidates}
          shownId={structureId}
          color="primary"
          titleOf={c =>
            `${c.mapping.row} matches ${lookup.result.accession} at ${c.identity}`
          }
          onPick={show}
        />
      ) : null}

      <SuperpositionSummary superposition={superposition} />

      {structureId ? (
        <Box sx={{ mt: 1.5 }}>
          <Suspense fallback={<Box sx={{ height: panelHeight }} />}>
            <StructurePanel
              model={model}
              structureIds={shownIds}
              transforms={superposed?.matrices}
              fitBy={superposition.state === 'tm' ? 'tm-align' : 'transforms'}
              onTmAlign={setTmFits}
              colorBy={paintBy}
              representation={representation}
              height={panelHeight}
            />
          </Suspense>
        </Box>
      ) : null}
    </Box>
  )
})

export default StructureSection
