import { inflate } from 'pako-esm2'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_WINDOW_SIZE,
  buildSessionUrl,
  collapsedLoc,
  connectedFeature,
  geneStats,
} from './geneExplorer'

import type { Transcript } from './geneExplorer'

// A minimal two-exon transcript on chr17. The exons are far enough apart
// (gap 800 bp > 2 * DEFAULT_WINDOW_SIZE) that collapsing keeps them separate.
const twoExon: Transcript = {
  refName: 'chr17',
  strand: -1,
  name: 'NM_000546.6',
  geneName: 'TP53',
  exons: [
    { start: 100, end: 200 },
    { start: 1000, end: 1100 },
  ],
  cds: [
    { start: 120, end: 200, phase: 0 },
    { start: 1000, end: 1080, phase: 1 },
  ],
}

// The session shape that actually travels through the URL, seen at the untyped
// JSON boundary. buildSessionUrl's return is a union over view kinds; decoding
// gives one place to describe the fields the assertions read.
interface DecodedView {
  id: string
  type: string
  connectedViewId?: string
  init?: { msaName?: string }
  structures?: { url: string; connectedViewId: string }[]
}
interface DecodedSession {
  views: DecodedView[]
  init?: { children: { viewIds: string[] }[] }
}

// Reverse of toUrlSafeB64 in geneExplorer.ts: url-safe base64 -> inflate -> JSON.
// Proves the emitted link inflates back to exactly the session we built — the one
// contract between the link and jbrowse-web's `encoded-` loader.
function decodeSession(url: string): DecodedSession {
  const encoded = url.split('&session=encoded-')[1]
  const b64 = encoded.replaceAll('-', '+').replaceAll('_', '/')
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(inflate(bytes, undefined)))
}

describe('collapsedLoc', () => {
  it('drops the chr prefix to hg38 canonical refNames', () => {
    expect(collapsedLoc(twoExon)).not.toContain('chr')
  })

  it('emits one 1-based padded region per exon when they stay separate', () => {
    // start 100 (interbase) - 40 padding = 60 -> 1-based 61; end 200 + 40 = 240
    expect(collapsedLoc(twoExon)).toBe('17:61-240 17:961-1140')
  })

  it('merges exons whose padded ranges overlap into one region', () => {
    const close: Transcript = {
      ...twoExon,
      exons: [
        { start: 100, end: 200 },
        { start: 250, end: 300 },
      ],
    }
    // padded [60,240] and [210,340] overlap (210 <= 240) -> single [60,340]
    expect(collapsedLoc(close)).toBe('17:61-340')
  })

  it('clamps padding at the start of the contig, never going below base 1', () => {
    const nearStart: Transcript = {
      ...twoExon,
      exons: [{ start: 10, end: 50 }],
    }
    expect(collapsedLoc(nearStart)).toBe('17:1-90')
  })

  it('spans the whole gene as one region when not collapsing', () => {
    expect(collapsedLoc(twoExon, { collapse: false })).toBe('17:101-1100')
  })

  it('exposes the padding used as DEFAULT_WINDOW_SIZE', () => {
    const wider = collapsedLoc(twoExon, { padding: DEFAULT_WINDOW_SIZE + 10 })
    // start 100 - 50 = 50 -> 1-based 51
    expect(wider).toContain('17:51-')
  })
})

describe('connectedFeature', () => {
  it('spans the CDS bounds and normalizes the refName', () => {
    const f = connectedFeature(twoExon)
    expect(f.refName).toBe('17')
    expect(f.start).toBe(120)
    expect(f.end).toBe(1080)
    expect(f.strand).toBe(-1)
    expect(f.uniqueId).toBe('NM_000546.6')
  })

  it('carries every CDS as a phased subfeature', () => {
    const f = connectedFeature(twoExon)
    expect(f.subfeatures).toEqual([
      { type: 'CDS', start: 120, end: 200, strand: -1, phase: 0 },
      { type: 'CDS', start: 1000, end: 1080, strand: -1, phase: 1 },
    ])
  })
})

describe('geneStats', () => {
  it('sums CDS length and measures the collapse ratio off the coding model', () => {
    // CDS lengths 80 + 80 = 160; span from 120 to 1080 = 960; ratio 960/160 = 6.0
    expect(geneStats(twoExon)).toEqual({
      codingBp: 160,
      span: 960,
      ratio: '6.0',
    })
  })
})

describe('buildSessionUrl', () => {
  it('emits a genome-only session when no alignment or structure is available', () => {
    const { url } = buildSessionUrl({ transcript: twoExon })
    const decoded = decodeSession(url)
    expect(decoded.views.map(v => v.type)).toEqual(['LinearGenomeView'])
    expect(decoded.init).toBeUndefined()
  })

  it('adds connected MSA and Protein views with a side-by-side layout', () => {
    const { url } = buildSessionUrl({
      transcript: twoExon,
      uniprotId: 'P04637',
      proteinSequence: 'MEEPQSDPSV',
      msaAvailable: true,
    })
    const decoded = decodeSession(url)
    const [lgv, msa, protein] = decoded.views
    expect([lgv.type, msa.type, protein.type]).toEqual([
      'LinearGenomeView',
      'MsaView',
      'ProteinView',
    ])
    // the views link to the genome view by id
    expect(msa.connectedViewId).toBe(lgv.id)
    expect(protein.structures?.[0].connectedViewId).toBe(lgv.id)
    // MsaView reads its block by gene symbol; ProteinView loads the AlphaFold cif
    expect(msa.init?.msaName).toBe('TP53')
    expect(protein.structures?.[0].url).toContain('AF-P04637-')
    // genome+alignment left, structure right
    expect(decoded.init?.children[0].viewIds).toEqual([lgv.id, msa.id])
    expect(decoded.init?.children[1].viewIds).toEqual([protein.id])
  })

  it('round-trips: the encoded URL inflates back to the exact session', () => {
    const { session, url } = buildSessionUrl({
      transcript: twoExon,
      uniprotId: 'P04637',
      proteinSequence: 'MEEPQSDPSV',
      msaAvailable: true,
    })
    expect(decodeSession(url)).toEqual(session)
  })

  it('includes the AlphaFold structure even without an alignment', () => {
    const { url } = buildSessionUrl({
      transcript: twoExon,
      uniprotId: 'P04637',
      proteinSequence: 'MEEPQSDPSV',
      msaAvailable: false,
    })
    expect(decodeSession(url).views.map(v => v.type)).toEqual([
      'LinearGenomeView',
      'ProteinView',
    ])
  })

  it('embeds a GenArk assembly and names the LGV by it for non-human genes', () => {
    const { session } = buildSessionUrl({
      transcript: twoExon,
      assemblyAccession: 'GCF_000001635.27',
    })
    const decoded = session as unknown as {
      sessionAssemblies?: { name: string }[]
      views: { init?: { assembly?: string } }[]
    }
    expect(decoded.sessionAssemblies?.[0].name).toBe('GCF_000001635.27')
    expect(decoded.views[0].init?.assembly).toBe('GCF_000001635.27')
  })

  it('leaves human on the hosted hg38 config assembly (no sessionAssemblies)', () => {
    const { session } = buildSessionUrl({ transcript: twoExon })
    expect('sessionAssemblies' in session).toBe(false)
  })

  it('carries an inline ortholog alignment as a connected MsaView with data', () => {
    const { url } = buildSessionUrl({
      transcript: twoExon,
      uniprotId: 'P04637',
      proteinSequence: 'MEEPQSDPSV',
      assemblyAccession: 'GCF_000001635.27',
      inlineMsa: {
        fasta: '>Mouse\nMEEP\n>Human\nMEEP',
        newick: '(Mouse,Human);',
        querySeqName: 'Mouse',
      },
    })
    const decoded = decodeSession(url) as unknown as {
      views: {
        id: string
        type: string
        connectedViewId?: string
        data?: { msa?: string; tree?: string }
      }[]
    }
    const lgv = decoded.views[0]
    const msa = decoded.views.find(v => v.type === 'MsaView')
    expect(msa?.data?.msa).toContain('>Mouse')
    expect(msa?.data?.tree).toBe('(Mouse,Human);')
    // the alignment links back to the genome view
    expect(msa?.connectedViewId).toBe(lgv.id)
  })
})
