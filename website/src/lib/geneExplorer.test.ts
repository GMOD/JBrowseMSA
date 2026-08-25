import { readFileSync } from 'node:fs'

import { fromUrlSafeB64 } from '@jbrowse/core/util'
import { describe, expect, it } from 'vitest'

import {
  CONSERVATION_TRACK,
  DEFAULT_WINDOW_SIZE,
  buildSession,
  clinvarTrack,
  collapsedLoc,
  connectedFeature,
  geneStats,
  sessionUrl,
} from './geneExplorer'

import type { Genome, SessionOptions, Transcript } from './geneExplorer'

// A minimal two-exon transcript on hg38's chromosome 17, named canonically. The
// exons are far enough apart (gap 800 bp > 2 * DEFAULT_WINDOW_SIZE) that
// collapsing keeps them separate.
const twoExon: Transcript = {
  refName: '17',
  strand: -1,
  name: 'NM_000546.6',
  geneName: 'TP53',
  cds: [
    { start: 120, end: 200, phase: 0 },
    { start: 1000, end: 1080, phase: 1 },
  ],
}

const hg38: Genome = {
  configUrl:
    'https://gmod.org/JBrowseMSA/demo/data/jbrowse-msa-combined-config.json',
  assemblyName: 'hg38',
  geneTrackId: 'hg38-ncbiRefSeqSelect',
}

const mouse: Genome = {
  configUrl:
    'https://jbrowse.org/hubs/genark/GCF/000/001/635/GCF_000001635.27/config.json',
  assemblyName: 'GCF_000001635.27',
  geneTrackId: 'GCF_000001635.27-ncbiRefSeqSelect',
}

// The session shape that actually travels through the URL, seen at the untyped
// JSON boundary. buildSession's return is a union over view kinds; decoding
// gives one place to describe the fields the assertions read.
interface DecodedView {
  id: string
  type: string
  connectedViewId?: string
  init?: {
    msaName?: string
    loc?: string
    assembly?: string
    tracks?: string[]
  }
  structures?: { url: string; connectedViewId: string }[]
  orthologParams?: {
    taxId: number
    source: string
    geneCandidates: string[]
    msaAlgorithm: string
    proteinSequence?: string
  }
}
interface DecodedSession {
  views: DecodedView[]
  useWorkspaces?: boolean
  activePanelId?: string
  layout?: {
    direction: string
    children: { size: number; tabs: { viewIds: string[] }[] }[]
  }
}

// jbrowse-web's `encoded-` loader: url-safe base64 -> inflate -> JSON. Proves
// the emitted link inflates back to exactly the session we built.
async function decodeSession(url: string): Promise<DecodedSession> {
  return JSON.parse(await fromUrlSafeB64(url.split('&session=encoded-')[1]))
}

describe('collapsedLoc', () => {
  it('names regions by the transcript refName as given (already canonical)', () => {
    expect(collapsedLoc(twoExon).split(' ')[0]).toMatch(/^17:/)
  })

  it('emits one 1-based padded region per exon when they stay separate', () => {
    // start 120 (interbase) - 40 padding = 80 -> 1-based 81; end 200 + 40 = 240
    expect(collapsedLoc(twoExon)).toBe('17:81-240 17:961-1120')
  })

  it('merges exons whose padded ranges overlap into one region', () => {
    const close: Transcript = {
      ...twoExon,
      cds: [
        { start: 100, end: 200, phase: 0 },
        { start: 250, end: 300, phase: 2 },
      ],
    }
    // padded [60,240] and [210,340] overlap (210 <= 240) -> single [60,340]
    expect(collapsedLoc(close)).toBe('17:61-340')
  })

  it('clamps padding at the start of the contig, never going below base 1', () => {
    const nearStart: Transcript = {
      ...twoExon,
      cds: [{ start: 10, end: 50, phase: 0 }],
    }
    expect(collapsedLoc(nearStart)).toBe('17:1-90')
  })

  it('spans the whole coding model as one region when not collapsing', () => {
    expect(collapsedLoc(twoExon, { collapse: false })).toBe('17:121-1080')
  })

  it('flips a minus-strand gene: regions last-to-first, each marked [rev]', () => {
    expect(collapsedLoc(twoExon, { flip: true })).toBe(
      '17:961-1120[rev] 17:81-240[rev]',
    )
    expect(collapsedLoc(twoExon, { flip: true, collapse: false })).toBe(
      '17:121-1080[rev]',
    )
  })

  it('exposes the padding used as DEFAULT_WINDOW_SIZE', () => {
    const wider = collapsedLoc(twoExon, { padding: DEFAULT_WINDOW_SIZE + 10 })
    // start 120 - 50 = 70 -> 1-based 71
    expect(wider).toContain('17:71-')
  })
})

describe('connectedFeature', () => {
  it('spans the CDS bounds on the transcript refName', () => {
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

// The combined config the sessions open against; the ClinVar table in
// geneExplorer.ts must name exactly the genes it carries a track for.
const configTrackIds: string[] = (
  JSON.parse(
    readFileSync(
      new URL(
        '../../../packages/app/public/data/jbrowse-msa-combined-config.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as { tracks: { trackId: string }[] }
).tracks.map(t => t.trackId)

// The genome view's init blob for a session over twoExon. The views array is a
// union over view kinds, and the first entry is always the LinearGenomeView.
function genomeInit(opts: Partial<SessionOptions> = {}) {
  const [lgv] = buildSession({
    genome: hg38,
    transcript: twoExon,
    ...opts,
  }).views
  return (lgv as { init: { loc: string; tracks: string[] } }).init
}

describe('hg38 tracks', () => {
  it('names a ClinVar track for exactly the genes the config carries', () => {
    const inConfig = configTrackIds
      .map(id => /^hg38-(\w+)-clinvar-pathogenic$/.exec(id)?.[1])
      .filter((g): g is string => !!g)
      .map(g => g.toUpperCase())
      .sort()
    const named = ['TP53', 'BRAF', 'KRAS', 'EGFR']
      .filter(g => clinvarTrack(g))
      .sort()
    expect(named).toEqual(inConfig)
    expect(clinvarTrack('TP53')).toBe('hg38-tp53-clinvar-pathogenic')
    expect(configTrackIds).toContain(clinvarTrack('TP53'))
  })

  it('has the conservation track in the config', () => {
    expect(configTrackIds).toContain(CONSERVATION_TRACK)
  })

  it('adds ClinVar automatically and conservation on request', () => {
    expect(genomeInit().tracks).toEqual([
      'hg38-ncbiRefSeqSelect',
      'hg38-tp53-clinvar-pathogenic',
    ])
    expect(genomeInit({ conservation: true }).tracks).toContain(
      CONSERVATION_TRACK,
    )
    expect(
      genomeInit({ transcript: { ...twoExon, geneName: 'KRAS' } }).tracks,
    ).toEqual(['hg38-ncbiRefSeqSelect'])
  })

  it('gives non-human sessions their own gene track and no hg38 tracks', () => {
    expect(genomeInit({ genome: mouse, conservation: true }).tracks).toEqual([
      'GCF_000001635.27-ncbiRefSeqSelect',
    ])
  })

  it('threads flip into the genome view loc', () => {
    expect(genomeInit({ flip: true }).loc).toBe(
      '17:961-1120[rev] 17:81-240[rev]',
    )
  })
})

describe('buildSession', () => {
  it('emits a genome-only session when no alignment or structure is available', () => {
    const session = buildSession({ genome: hg38, transcript: twoExon })
    expect(session.views.map(v => v.type)).toEqual(['LinearGenomeView'])
    expect('layout' in session).toBe(false)
  })

  it('adds connected MSA and Protein views, tiled side by side', async () => {
    const session = buildSession({
      genome: hg38,
      transcript: twoExon,
      uniprotId: 'P04637',
      proteinSequence: 'MEEPQSDPSV',
      msaAvailable: true,
    })
    const decoded = await decodeSession(await sessionUrl(session))
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
    // the workspace tree jbrowse-web restores: genome + alignment in the left
    // cell, the structure in the right, workspaces switched on for the session
    expect(decoded.useWorkspaces).toBe(true)
    expect(decoded.layout?.direction).toBe('row')
    expect(decoded.layout?.children.map(c => c.tabs[0].viewIds)).toEqual([
      [lgv.id, msa.id],
      [protein.id],
    ])
    expect(decoded.layout?.children.map(c => c.size)).toEqual([58, 42])
    expect(decoded.activePanelId).toBe('panel-left')
  })

  it('round-trips: the encoded URL inflates back to the exact session', async () => {
    const session = buildSession({
      genome: hg38,
      transcript: twoExon,
      uniprotId: 'P04637',
      proteinSequence: 'MEEPQSDPSV',
      msaAvailable: true,
    })
    expect(await decodeSession(await sessionUrl(session))).toEqual(session)
  })

  it('includes the AlphaFold structure even without an alignment', () => {
    const session = buildSession({
      genome: hg38,
      transcript: twoExon,
      uniprotId: 'P04637',
      proteinSequence: 'MEEPQSDPSV',
      msaAvailable: false,
    })
    expect(session.views.map(v => v.type)).toEqual([
      'LinearGenomeView',
      'ProteinView',
    ])
  })

  it('opens non-human genes on their jb2hubs genome and gene track', async () => {
    const session = buildSession({ genome: mouse, transcript: twoExon })
    const url = await sessionUrl(session, mouse)
    expect(url).toContain(`config=${encodeURIComponent(mouse.configUrl)}`)
    const [lgv] = (await decodeSession(url)).views
    expect(lgv.init?.assembly).toBe('GCF_000001635.27')
    expect(lgv.init?.tracks).toEqual(['GCF_000001635.27-ncbiRefSeqSelect'])
    expect('sessionAssemblies' in session).toBe(false)
  })

  it('opens human genes on the hosted hg38 config by default', async () => {
    const session = buildSession({ genome: hg38, transcript: twoExon })
    expect(await sessionUrl(session)).toContain(
      `config=${encodeURIComponent(hg38.configUrl)}`,
    )
  })

  it('carries an ortholog request the msaview plugin resolves at launch', () => {
    const session = buildSession({
      genome: mouse,
      transcript: twoExon,
      uniprotId: 'P04637',
      proteinSequence: 'MEEPQSDPSV',
      orthologs: {
        taxId: 10090,
        geneId: '22059',
        proteinSequence: 'MEEPQSDPSV',
        source: 'ncbi',
      },
    })
    const [lgv, msa, protein] = session.views as DecodedView[]
    expect(msa.type).toBe('MsaView')
    expect(msa.orthologParams).toEqual({
      taxId: 10090,
      source: 'ncbi',
      geneCandidates: ['22059', 'TP53'],
      msaAlgorithm: 'clustalo',
      proteinSequence: 'MEEPQSDPSV',
    })
    expect('data' in msa).toBe(false)
    // the alignment links back to the genome view and sits beside it
    expect(msa.connectedViewId).toBe(lgv.id)
    expect(session.layout?.children[0].tabs[0].viewIds).toEqual([
      lgv.id,
      msa.id,
    ])
    expect(session.layout?.children[1].tabs[0].viewIds).toEqual([protein.id])
  })

  it('names the gene by symbol first when PANTHER is the ortholog source', () => {
    const session = buildSession({
      genome: mouse,
      transcript: { ...twoExon, geneName: 'CDC28' },
      orthologs: {
        taxId: 559292,
        geneId: '852457',
        proteinSequence: 'MSGELANYKR',
        source: 'panther',
      },
    })
    const msa = session.views.find(v => v.type === 'MsaView') as DecodedView
    expect(msa.orthologParams?.source).toBe('panther')
    expect(msa.orthologParams?.geneCandidates).toEqual(['CDC28', '852457'])
  })
})
