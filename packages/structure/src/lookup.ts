import { getUngappedSequence } from 'msa-parsers'
import {
  alignmentQuality,
  describeAlignmentQuality,
  fetchAlphaFoldModels,
  fetchExperimentalStructures,
  fetchLabelChains,
  fetchPdbEntry,
  getPdbStructureUrl,
  isLowSimilarity,
  makeUniProtPositionMap,
  pickAlphaFoldModel,
  uniprotFastaUrl,
} from 'p2s_mapper'

import { accessionOfRowName } from './accession.ts'
import { fetchText } from './fetchText.ts'
import { identifiersOfRowName, searchAccession } from './identifiers.ts'
import { alignToReference, composePairs, segmentsOfPairs } from './segments.ts'

import type { RowIdentifier } from './identifiers.ts'
import type {
  AlphaFoldModel,
  ExperimentalStructure,
  PdbEntry,
} from 'p2s_mapper'
import type { ResidueMapping } from 'react-msaview'

export interface StructureCandidate {
  /** ready for `model.setResidueMappings` */
  mapping: ResidueMapping
  kind: 'predicted' | 'experimental'
  /** a line for a menu, such as `1TUP chain A · X-ray 2.2 Å` */
  label: string
  /** how well the row matches the UniProt entry the structure is numbered on */
  identity: string
}

export interface StructureSearch {
  accession?: string
  /** the name in the row's header the accession was looked up from */
  resolvedFrom?: string
  candidates: StructureCandidate[]
  /** why there are none, or why the row's match is doubtful */
  problem?: string
}

/** the network reads, replaceable so a test needs no network */
export interface Lookups {
  alphaFoldModels: (accession: string) => Promise<AlphaFoldModel[]>
  experimental: (accession: string) => Promise<ExperimentalStructure[]>
  pdbEntry: (pdbId: string) => Promise<PdbEntry>
  /** the UniProt entry's canonical sequence */
  canonicalSequence: (accession: string) => Promise<string>
  /** the accession of an entry name or RefSeq id, undefined when UniProt has none */
  resolveAccession: (identifier: RowIdentifier) => Promise<string | undefined>
  /** the `label_asym_id` of an author chain, undefined when RCSB has none */
  labelChain: (pdbId: string, authChain: string) => Promise<string | undefined>
}

// one resolution per name for the session, since a name in a header repeats
// across the rows of every alignment that carries it. The shared request runs
// without any caller's signal, so one caller aborting leaves it for the next.
const resolved = new Map<string, Promise<string | undefined>>()

function abortable<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) {
    return promise
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason)
    }
    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort)
    })
  })
}

function resolveAccessionShared(identifier: RowIdentifier) {
  const key = `${identifier.kind}:${identifier.value}`
  let found = resolved.get(key)
  if (!found) {
    found = searchAccession(identifier)
    resolved.set(key, found)
    found.catch(() => {
      resolved.delete(key)
    })
  }
  return found
}

export function networkLookups(signal?: AbortSignal): Lookups {
  const opts = signal ? { signal } : undefined
  return {
    resolveAccession: identifier =>
      abortable(resolveAccessionShared(identifier), signal),
    alphaFoldModels: accession => fetchAlphaFoldModels(accession, opts),
    experimental: accession => fetchExperimentalStructures(accession, opts),
    pdbEntry: pdbId => fetchPdbEntry(pdbId, opts),
    canonicalSequence: async accession =>
      sequenceOfFasta(await fetchText(uniprotFastaUrl(accession), signal)),
    labelChain: async (pdbId, authChain) =>
      (await fetchLabelChains(pdbId, opts)).get(authChain),
  }
}

export function generated(detail: string) {
  return {
    by: `react-msaview-structure: ${detail}`,
    date: new Date().toISOString().slice(0, 10),
  }
}

function sequenceOfFasta(text: string) {
  return text
    .split('\n')
    .filter(line => !line.startsWith('>'))
    .join('')
    .trim()
}

function methodLabel({ method, resolution }: ExperimentalStructure) {
  return resolution === undefined
    ? method
    : `${method} ${resolution.toFixed(1)} Å`
}

/**
 * Finds the structures of a row's protein and the residue correspondence onto
 * each. The row names its UniProt entry, or the caller passes the accession.
 * The row is aligned once, to the entry's canonical sequence; AlphaFold models
 * and PDB entries are numbered on that sequence, so every correspondence below
 * composes that alignment with the entry's own. The AlphaFold model carries
 * the sequence, and an entry AlphaFold DB has no model of has it read from
 * UniProt.
 *
 * `rowSequence` may carry gaps. A row that does not match its entry
 * (`isLowSimilarity`) gets no candidates and a problem, since a mapping
 * computed from a chance alignment would light the wrong residues.
 */
export async function findStructures({
  rowName,
  rowSequence,
  accession: given,
  lookups = networkLookups(),
  maxExperimental = 6,
}: {
  rowName: string
  rowSequence: string
  accession?: string
  lookups?: Lookups
  maxExperimental?: number
}): Promise<StructureSearch> {
  let accession = given ?? accessionOfRowName(rowName)
  let resolvedFrom: string | undefined
  if (!accession) {
    const identifiers = identifiersOfRowName(rowName)
    const failures: string[] = []
    for (const identifier of identifiers) {
      try {
        accession = await lookups.resolveAccession(identifier)
      } catch (e) {
        failures.push(e instanceof Error ? e.message : String(e))
      }
      if (accession) {
        resolvedFrom = identifier.value
        break
      }
    }
    if (!accession) {
      const tried = identifiers.map(i => i.value).join(', ')
      return {
        candidates: [],
        problem:
          failures.length > 0
            ? `UniProt could not be reached to look up ${tried}: ${failures[0]}`
            : tried
              ? `UniProt has no entry for ${tried}. Give the accession to look its structures up.`
              : `${rowName} names no UniProt accession. Give one to look its structures up.`,
      }
    }
  }
  const protein = accession.replace(/-\d+$/, '')
  const from = resolvedFrom === undefined ? {} : { resolvedFrom }
  const models = await lookups.alphaFoldModels(protein)
  const model = pickAlphaFoldModel(models, undefined)
  let reference: string
  try {
    reference = model?.sequence ?? (await lookups.canonicalSequence(protein))
  } catch (e) {
    return {
      accession: protein,
      ...from,
      candidates: [],
      problem: `AlphaFold DB has no model for ${protein}, and UniProt could not be reached for its sequence: ${e instanceof Error ? e.message : String(e)}`,
    }
  }

  const row = getUngappedSequence(rowSequence).toUpperCase()
  const { alignment, pairs } = alignToReference(row, reference)
  const quality = alignmentQuality(alignment)
  const identity = describeAlignmentQuality(quality)
  if (isLowSimilarity(quality)) {
    return {
      accession: protein,
      ...from,
      candidates: [],
      problem: `${rowName} does not match ${protein}${resolvedFrom === undefined ? '' : `, which ${resolvedFrom} names`} (${identity}), so no residue mapping was made.`,
    }
  }

  const base = { row: rowName, accession: protein, rowLength: row.length }
  const candidates: StructureCandidate[] = model
    ? [
        {
          kind: 'predicted',
          identity,
          label: `AlphaFold model${model.meanPlddt === undefined ? '' : ` · pLDDT ${Math.round(model.meanPlddt)}`}`,
          mapping: {
            ...base,
            structure: {
              id: model.entity ?? `AF-${protein}-F1`,
              kind: 'predicted',
              asymId: 'A',
              asymIdKind: 'label',
              url: model.url,
            },
            segments: segmentsOfPairs(pairs),
            generated: generated(`AlphaFold DB ${protein}, ${identity}`),
          },
        },
      ]
    : []

  // PDB entries are numbered on the canonical sequence, and a row aligned
  // to an isoform model has positions on that isoform instead
  if (model?.accession.includes('-')) {
    return {
      accession: protein,
      ...from,
      candidates,
      problem: `AlphaFold DB holds only an isoform model of ${protein}, so PDB entries, which are numbered on the canonical sequence, were not mapped.`,
    }
  }

  let experimental: ExperimentalStructure[]
  try {
    experimental = (await lookups.experimental(protein)).slice(
      0,
      maxExperimental,
    )
  } catch (e) {
    return {
      accession: protein,
      ...from,
      candidates,
      problem: `RCSB could not be reached for the PDB entries of ${protein}: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
  const entries = await Promise.all(
    experimental.map(async structure => {
      try {
        return { structure, entry: await lookups.pdbEntry(structure.pdbId) }
      } catch {
        return undefined
      }
    }),
  )
  for (const found of entries) {
    if (!found) {
      continue
    }
    const { structure, entry } = found
    const siftsSegments =
      entry.mappings.find(m => m.accession === protein)?.segments ?? []
    const chain = structure.chains.find(c =>
      siftsSegments.some(s => s.chainId === c),
    )
    if (chain === undefined) {
      continue
    }
    const toStructure = makeUniProtPositionMap(
      siftsSegments.filter(s => s.chainId === chain),
    )
    // SEQRES positions run from 0 in the mapper and from 1 as label_seq_id
    const onChain = composePairs(pairs, unp => {
      const position = toStructure(unp)
      return position === undefined ? undefined : position + 1
    })
    if (onChain.length === 0) {
      continue
    }
    let label: string | undefined
    try {
      label = await lookups.labelChain(structure.pdbId, chain)
    } catch {
      label = undefined
    }
    candidates.push({
      kind: 'experimental',
      identity,
      label: `${structure.pdbId.toUpperCase()} chain ${chain} · ${methodLabel(structure)} · ${protein} ${structure.start}-${structure.end}`,
      mapping: {
        ...base,
        structure: {
          id: structure.pdbId.toUpperCase(),
          kind: 'experimental',
          asymId: label ?? chain,
          asymIdKind: label === undefined ? 'auth' : 'label',
          url: getPdbStructureUrl(structure.pdbId.toUpperCase()),
        },
        segments: segmentsOfPairs(onChain),
        generated: generated(`RCSB ${structure.pdbId} chain ${chain}`),
      },
    })
  }
  return {
    accession: protein,
    ...from,
    candidates,
    ...(candidates.length === 0
      ? {
          problem: `AlphaFold DB has no model for ${protein}, and no PDB entry maps onto it.`,
        }
      : {}),
  }
}
