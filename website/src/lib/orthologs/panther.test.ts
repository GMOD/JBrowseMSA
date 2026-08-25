import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchOrthologProteins,
  parseGenomes,
  parseMatches,
  parseSequences,
  pickOnePerGenome,
} from './panther'

// Captured from the live services (see the doc for the exact URLs), trimmed to
// the rows the assertions read.
function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      new URL(`./__fixtures__/${name}.json`, import.meta.url),
      'utf8',
    ),
  )
}

const cdc28 = fixture('panther-cdc28')

describe('parseMatches', () => {
  it('reads the query accession and one hit per target row', () => {
    const { unmapped, queryAccession, hits } = parseMatches(cdc28)
    expect(unmapped).toBe(false)
    expect(queryAccession).toBe('P00546')
    expect(hits).toHaveLength(7)
    expect(hits[0]).toEqual({
      code: 'HUMAN',
      accession: 'P11802',
      symbol: 'CDK4',
      type: 'O',
    })
    expect(hits.filter(h => h.type === 'LDO').map(h => h.code)).toEqual([
      'HUMAN',
      'MOUSE',
      'CAEEL',
    ])
  })

  it('treats a bare { id } mapping as zero hits, not an error', () => {
    const { unmapped, hits } = parseMatches(fixture('panther-empty'))
    expect(unmapped).toBe(false)
    expect(hits).toEqual([])
  })

  it('flags a gene PANTHER could not map', () => {
    expect(parseMatches(fixture('panther-unmapped')).unmapped).toBe(true)
  })
})

describe('pickOnePerGenome', () => {
  it('prefers the LDO, falling back to the first other ortholog', () => {
    const picks = pickOnePerGenome(parseMatches(cdc28).hits)
    const byCode = Object.fromEntries(picks.map(p => [p.code, p.accession]))
    expect(byCode).toEqual({
      HUMAN: 'P24941', // LDO CDK2 beats O CDK4 listed first
      MOUSE: 'P97377',
      CAEEL: 'O61847',
      DROME: 'Q7K306', // only an O
      ARATH: 'Q8LG64', // only an O
    })
  })
})

describe('parseGenomes', () => {
  it('maps organism code to taxon and names', () => {
    const genomes = parseGenomes(fixture('panther-genomes'))
    expect(genomes.find(g => g.code === 'DROME')).toEqual({
      code: 'DROME',
      taxId: 7227,
      name: 'fruit_fly',
      longName: 'Drosophila melanogaster',
    })
  })
})

describe('parseSequences', () => {
  it('keys sequences by primary accession', () => {
    const seqs = parseSequences(fixture('uniprot-accessions'))
    expect(seqs.size).toBe(6)
    expect(seqs.get('P00546')).toMatch(/^MSGELANYKRLEKVGEGTYGVVYK/)
  })
})

describe('fetchOrthologProteins', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the query first, then one ortholog per taxon in panel order', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', (url: string) => {
      calls.push(url)
      const body = url.includes('supportedgenomes')
        ? fixture('panther-genomes')
        : url.includes('matchortho')
          ? cdc28
          : fixture('uniprot-accessions')
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200 }),
      )
    })
    const rows = await fetchOrthologProteins({
      symbol: 'CDC28',
      taxId: 559292,
      taxa: [3702, 9606, 7227, 559292, 10090, 6239],
    })
    expect(rows.map(r => [r.label, r.accession])).toEqual([
      ['budding_yeast', 'P00546'],
      ['arabidopsis', 'Q8LG64'],
      ['human', 'P24941'],
      ['fruit_fly', 'Q7K306'],
      ['mouse', 'P97377'],
      ['nematode_worm', 'O61847'],
    ])
    expect(rows.every(r => r.sequence.length === 24)).toBe(true)
    // the query taxon is never a target of its own search
    const match = new URL(calls.find(u => u.includes('matchortho'))!)
    expect(match.searchParams.get('organism')).toBe('559292')
    expect(match.searchParams.get('targetOrganism')).toBe(
      '3702,9606,7227,10090,6239',
    )
  })

  it('names the gene when PANTHER cannot map it', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            url.includes('supportedgenomes')
              ? fixture('panther-genomes')
              : fixture('panther-unmapped'),
          ),
        ),
      ),
    )
    await expect(
      fetchOrthologProteins({ symbol: 'NOTAGENEXYZ', taxId: 9606 }),
    ).rejects.toThrow('no entry for NOTAGENEXYZ in Homo sapiens')
  })
})
