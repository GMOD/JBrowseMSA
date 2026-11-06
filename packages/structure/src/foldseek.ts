import {
  FOLDSEEK_MAX_RESIDUES,
  caCoordsToPdb,
  foldseekHitPairs,
  foldseekQuery,
  getStructureUrlFromTarget,
  hasValidCaCoords,
  isPdbId,
  searchFoldseek,
} from 'p2s_mapper'

import { caChain, parseCaCoordinates } from './cif.ts'
import { fetchText } from './fetchText.ts'
import { generated } from './lookup.ts'
import { composePairs, segmentsOfPairs } from './segments.ts'

import type { ChainCoordinates } from './cif.ts'
import type { FetchText } from './fetchText.ts'
import type { StructureCandidate } from './lookup.ts'
import type { FoldseekHit } from 'p2s_mapper'

// the client, the query and the hit alignment live in p2s_mapper, shared with
// the protein3d plugin
export { FOLDSEEK_MAX_RESIDUES, foldseekQuery, searchFoldseek }
export type { FoldseekHit }

function dataUrl(pdb: string) {
  return `data:chemical/x-pdb;charset=utf-8,${encodeURIComponent(pdb)}`
}

// a CA within this of the trace's is the same atom; an alternate location
// Foldseek picked differently moves a residue or two by up to an Å or so
const sameAtom = 0.05
const altLocation = 2

function matchesTrace(chain: ChainCoordinates, trace: number[]) {
  const atoms = [...chain.values()]
  if (atoms.length * 3 !== trace.length) {
    return false
  }
  let same = 0
  for (const [i, atom] of atoms.entries()) {
    const off = Math.max(...atom.map((v, k) => Math.abs(v - trace[3 * i + k]!)))
    if (off > altLocation) {
      return false
    }
    if (off <= sameAtom) {
      same++
    }
  }
  return same >= 0.9 * atoms.length
}

/**
 * The assembly file a pdb100 hit was searched in, and the chain whose CA atoms
 * are the hit's trace, so target position i is the chain's i-th residue.
 * Undefined when the file cannot be read or no chain matches the trace.
 */
async function entryChain(target: string, trace: string, read: FetchText) {
  const parsed = /^(\w{4})-assembly(\d+)\.cif\.gz_(\S+)/.exec(target)
  if (!parsed) {
    return undefined
  }
  const [, pdbId = '', assembly, authChain] = parsed
  const url = `https://files.rcsb.org/download/${pdbId.toUpperCase()}-assembly${assembly}.cif`
  let coordinates
  try {
    coordinates = parseCaCoordinates(await read(url))
  } catch {
    return undefined
  }
  if (!coordinates) {
    return undefined
  }
  const points = trace.split(',').map(Number)
  const named = caChain(coordinates, authChain, 'auth')
  const chain =
    named && matchesTrace(named, points)
      ? named
      : [...coordinates.label.values()].find(c => matchesTrace(c, points))
  const labelId = [...coordinates.label].find(([, c]) => c === chain)?.[0]
  return chain && labelId !== undefined
    ? {
        id: `${pdbId.toUpperCase()}-assembly${assembly}`,
        url,
        labelId,
        seqIds: [...chain.keys()],
      }
    : undefined
}

function describe(hit: FoldseekHit) {
  const [id = '', ...rest] = hit.target.split(' ')
  return { id, description: rest.join(' ') }
}

/**
 * Turns hits into candidates with a residue mapping each. Foldseek's alignment
 * of the query to the target is the correspondence, numbered by position in the
 * target's sequence.
 *
 * An AlphaFold F1 model is the UniProt sequence, so a target position is its
 * `label_seq_id` and the hit opens from its own file. A pdb100 target is a chain
 * of an RCSB assembly file holding only the residues with coordinates, so the
 * candidate reads that file and numbers the chain whose CA atoms are the hit's
 * `tCa` trace. Where the file cannot be read or no chain matches, the trace
 * itself, numbered 1..n, is drawn from a `data:` URL instead.
 */
export async function foldseekCandidates({
  rowName,
  rowSequence,
  hits,
  perDatabase = 4,
  fetchText: read = fetchText,
}: {
  rowName: string
  rowSequence: string
  hits: FoldseekHit[]
  perDatabase?: number
  fetchText?: FetchText
}): Promise<StructureCandidate[]> {
  const query = foldseekQuery(rowSequence)
  const rowLength = rowSequence.replaceAll(/[-.]/g, '').length
  const taken = new Map<string, number>()
  const chosen = hits.flatMap(hit => {
    if ((taken.get(hit.db) ?? 0) >= perDatabase) {
      return []
    }
    const pairs = foldseekHitPairs(hit, query)
    const { id } = describe(hit)
    const alphaFold = /^AF-[A-Z0-9]+(?:-\d+)?-F1-model_v\d+$/.test(id)
    const url = alphaFold
      ? getStructureUrlFromTarget(hit.target, hit.db)
      : undefined
    if (!pairs || pairs.length === 0 || !(url || hasValidCaCoords(hit))) {
      return []
    }
    taken.set(hit.db, (taken.get(hit.db) ?? 0) + 1)
    return [{ hit, pairs, id, url }]
  })
  const built = await Promise.all(
    chosen.map(async ({ hit, pairs, id, url }) => {
      if (url) {
        return {
          hit,
          id,
          pairs,
          structure: {
            id: id.replace(/-model_v\d+$/, ''),
            kind: 'predicted' as const,
            asymId: 'A',
            asymIdKind: 'label' as const,
            url,
          },
        }
      }
      if (!hasValidCaCoords(hit)) {
        return undefined
      }
      const entry = await entryChain(hit.target, hit.tCa, read)
      if (entry) {
        return {
          hit,
          id,
          pairs: composePairs(pairs, position => entry.seqIds[position - 1]),
          structure: {
            id: entry.id,
            kind: 'experimental' as const,
            asymId: entry.labelId,
            asymIdKind: 'label' as const,
            url: entry.url,
          },
        }
      }
      const pdbId = isPdbId(id.slice(0, 4))
        ? id.slice(0, 4).toUpperCase()
        : undefined
      const chain = /_([A-Za-z0-9]+)$/.exec(id)?.[1]
      const name = pdbId ? `${pdbId}${chain ? `_${chain}` : ''}` : id
      return {
        hit,
        id,
        pairs,
        structure: {
          id: `${name} (Foldseek)`,
          kind: pdbId ? ('experimental' as const) : ('predicted' as const),
          asymId: 'A',
          asymIdKind: 'label' as const,
          url: dataUrl(caCoordsToPdb(hit.tCa, hit.tSeq, 'A', name)),
        },
      }
    }),
  )
  return built.flatMap(found => {
    if (!found) {
      return []
    }
    const { hit, id, pairs, structure } = found
    const { description } = describe(hit)
    const identity = `${hit.seqId === undefined ? '?' : `${hit.seqId}%`} identity over ${pairs.length} residues, Foldseek 3Di+AA against ${hit.db}`
    return [
      {
        kind: structure.kind,
        identity,
        label: `Foldseek · ${structure.id.replace(' (Foldseek)', '')} · ${hit.seqId === undefined ? '' : `${Math.round(hit.seqId)}% id · `}${hit.taxName ?? description}`,
        mapping: {
          row: rowName,
          rowLength,
          structure,
          segments: segmentsOfPairs(pairs),
          generated: generated(`Foldseek ${hit.db} ${id}, ${identity}`),
        },
      },
    ]
  })
}
