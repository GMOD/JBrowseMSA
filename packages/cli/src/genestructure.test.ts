import { describe, expect, test } from 'vitest'

import { codingExons, pickTranscript } from './genestructure.ts'

// codingExons works purely in transcript coordinates (exon lengths in transcript
// order, intersected with the CDS range), so it is strand-agnostic and needs no
// network. `begin`/`end` only contribute a length (end - begin + 1).
function exon(order: number, len: number) {
  return { order, begin: '1', end: String(len) }
}

describe('codingExons', () => {
  test('trims the 5′ and 3′ UTR portions of the boundary exons', () => {
    const t = {
      accession_version: 'TEST.1',
      cds: { range: [{ begin: '5', end: '25' }] }, // transcript coords
      genomic_locations: [{ exons: [exon(1, 10), exon(2, 10), exon(3, 10)] }],
    }
    expect(codingExons(t)).toEqual([
      { exon: 1, cdsStart: 0, cdsLen: 6 }, // exon1 [1,10] ∩ CDS[5,25] = [5,10]
      { exon: 2, cdsStart: 6, cdsLen: 10 }, // fully coding
      { exon: 3, cdsStart: 16, cdsLen: 5 }, // exon3 [21,30] ∩ CDS = [21,25]
    ])
  })

  test('skips a wholly-noncoding (UTR-only) exon and renumbers coding exons', () => {
    const t = {
      accession_version: 'TEST.2',
      cds: { range: [{ begin: '5', end: '20' }] },
      genomic_locations: [{ exons: [exon(1, 4), exon(2, 10), exon(3, 10)] }],
    }
    // exon1 [1,4] is entirely 5′UTR -> dropped; coding exons start at the next
    expect(codingExons(t)).toEqual([
      { exon: 1, cdsStart: 0, cdsLen: 10 },
      { exon: 2, cdsStart: 10, cdsLen: 6 },
    ])
  })

  test('respects transcript order regardless of array order', () => {
    const t = {
      accession_version: 'TEST.3',
      cds: { range: [{ begin: '1', end: '30' }] },
      genomic_locations: [{ exons: [exon(3, 10), exon(1, 10), exon(2, 10)] }],
    }
    expect(codingExons(t).map(e => e.cdsStart)).toEqual([0, 10, 20])
  })

  test('reproduces the real F12 (NM_000505.4) coding-exon lengths', () => {
    // 14 exons in transcript order (lengths), CDS at transcript 38..1885 — the
    // values the NCBI Datasets API returns. Coding lengths must match the
    // hand-derived f12-cetacean pipeline: [57,58,100,...,168], summing to 1848.
    const exonLens = [
      94, 58, 100, 71, 111, 132, 105, 166, 218, 232, 137, 144, 149, 319,
    ]
    const t = {
      accession_version: 'NM_000505.4',
      length: 2036,
      cds: { range: [{ begin: '38', end: '1885' }] },
      genomic_locations: [
        { exons: exonLens.map((len, i) => exon(i + 1, len)) },
      ],
    }
    const out = codingExons(t)
    expect(out.map(e => e.cdsLen)).toEqual([
      57, 58, 100, 71, 111, 132, 105, 166, 218, 232, 137, 144, 149, 168,
    ])
    expect(out.reduce((a, e) => a + e.cdsLen, 0)).toBe(1848)
    expect(out[0]!.cdsStart).toBe(0)
  })

  test('throws on a non-coding transcript (no CDS)', () => {
    expect(() =>
      codingExons({
        accession_version: 'NR_000000.1',
        genomic_locations: [{ exons: [exon(1, 10)] }],
      }),
    ).toThrow(/no CDS/)
  })

  test('throws when the chosen transcript has no genomic exon mapping', () => {
    expect(() =>
      codingExons({
        accession_version: 'NM_011640.4',
        cds: { range: [{ begin: '1', end: '30' }] },
      }),
    ).toThrow(/no genomic exon mapping/)
  })
})

describe('pickTranscript', () => {
  const withExons = { exons: [{ order: 1, begin: '1', end: '30' }] }
  const cds = { range: [{ begin: '1', end: '30' }] }

  test('prefers MANE Select', () => {
    const ts = [
      {
        accession_version: 'XM_1',
        type: 'PROTEIN_CODING_MODEL',
        cds,
        genomic_locations: [withExons],
      },
      {
        accession_version: 'NM_1',
        select_category: 'MANE_SELECT',
        type: 'PROTEIN_CODING',
        cds,
        genomic_locations: [withExons],
      },
    ]
    expect(pickTranscript(ts).accession_version).toBe('NM_1')
  })

  test('falls back past an unmapped Select transcript to a usable one (mouse Trp53 case)', () => {
    const ts = [
      // RefSeq Select but NO genomic exon mapping — must be skipped
      {
        accession_version: 'NM_011640.4',
        select_category: 'RefSeq_Select',
        type: 'PROTEIN_CODING',
        cds,
      },
      {
        accession_version: 'XM_006533157.5',
        type: 'PROTEIN_CODING_MODEL',
        cds,
        genomic_locations: [withExons],
      },
    ]
    expect(pickTranscript(ts).accession_version).toBe('XM_006533157.5')
  })

  test('honors an explicit transcript request (version-insensitive)', () => {
    const ts = [
      {
        accession_version: 'NM_1',
        select_category: 'MANE_SELECT',
        cds,
        genomic_locations: [withExons],
      },
      { accession_version: 'NM_000505.4', cds, genomic_locations: [withExons] },
    ]
    expect(pickTranscript(ts, 'NM_000505').accession_version).toBe(
      'NM_000505.4',
    )
  })
})
