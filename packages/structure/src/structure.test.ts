import { describe, expect, test } from 'vitest'

import { accessionOfRowName } from './accession.ts'
import { canFindStructures, identifiersOfRowName } from './identifiers.ts'
import { findStructures } from './lookup.ts'
import { pairsOfAlignment, segmentsOfPairs } from './segments.ts'

import type { Lookups } from './lookup.ts'

describe('accessionOfRowName', () => {
  test.each([
    ['sp|P04637|P53_HUMAN', 'P04637'],
    ['tr|A0A024R161|A0A024R161_HUMAN', 'A0A024R161'],
    ['P04637/1-393', 'P04637'],
    ['AF-P04637-F1', 'P04637'],
    ['Q9Y6K9-2 isoform 2', 'Q9Y6K9-2'],
    ['Q6YDQ7_9VIRU/46-492', 'Q6YDQ7'],
  ])('%s -> %s', (name, accession) => {
    expect(accessionOfRowName(name)).toBe(accession)
  })

  test.each(['HBA_HUMAN', 'NP_000549.1', 'SARS-CoV-2', 'Human'])(
    '%s names no accession',
    name => {
      expect(accessionOfRowName(name)).toBeUndefined()
    },
  )
})

describe('segmentsOfPairs', () => {
  test('a gap in either sequence starts a new segment', () => {
    const pairs = pairsOfAlignment('AC-DEFG', 'ACXD-FG')
    expect(pairs).toEqual([
      [1, 1],
      [2, 2],
      [3, 4],
      [5, 5],
      [6, 6],
    ])
    expect(segmentsOfPairs(pairs)).toEqual([
      { rowStart: 1, rowEnd: 2, structStart: 1, structEnd: 2 },
      { rowStart: 3, rowEnd: 3, structStart: 4, structEnd: 4 },
      { rowStart: 5, rowEnd: 6, structStart: 5, structEnd: 6 },
    ])
  })
})

// MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP is p53's start
const unp =
  'MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYQGSYGFRLGFLHSGTAKSVTCTYSPALNKMFCQLAKTCPVQLWVDSTPPPGTRVRAMAIYKQSQHMTEVVRRCPHHERCSDSDGLAPPQHLIRVEGNLRVEYLDDRNTFRHSVVVPYEPPEVGSDCTTIHYNYMCNSSCMGGMNRRPILTIITLEDSSGNLLGRNSFEVRVCACPGRDRRTEEENLRKKGEPHHELPPGSTKRALPNNTSSSPQPKKKPLDGEYFTLQIRGRERFEMFRELNEALELKDAQAGKEPGGSRAHSSHLKSKKGQSTSRHKKLMFKTEGPDSD'

function lookups(overrides: Partial<Lookups> = {}): Lookups {
  return {
    alphaFoldModels: () =>
      Promise.resolve([
        {
          accession: 'P04637',
          entity: 'AF-P04637-F1',
          url: 'https://alphafold.ebi.ac.uk/files/AF-P04637-F1-model_v6.cif',
          meanPlddt: 76.4,
          sequence: unp,
        },
      ]),
    experimental: () =>
      Promise.resolve([
        {
          pdbId: '1TUP',
          method: 'X-ray',
          resolution: 2.2,
          start: 94,
          end: 312,
          coverage: 0.55,
          chains: ['A', 'B'],
        },
      ]),
    pdbEntry: () =>
      Promise.resolve({
        proteinSequences: [],
        mappings: [
          {
            accession: 'P04637',
            segments: [
              // construct residue 1 is UniProt 94, as in 1TUP
              {
                entityId: '1',
                chainId: 'A',
                unpStart: 94,
                unpEnd: 312,
                structStart: 0,
                structEnd: 218,
              },
            ],
          },
        ],
      }),
    canonicalSequence: () => Promise.reject(new Error('no request expected')),
    resolveAccession: () => Promise.resolve(undefined),
    // 1TUP: author chain A is label chain A; the second entry swaps them
    labelChain: (pdbId, chain) =>
      Promise.resolve(pdbId === '1TUP' && chain === 'A' ? 'X' : undefined),
    ...overrides,
  }
}

describe('findStructures', () => {
  test('puts the AlphaFold model on UniProt numbering and the PDB entry on SEQRES', async () => {
    const found = await findStructures({
      rowName: 'sp|P04637|P53_HUMAN',
      rowSequence: unp.slice(0, 20) + '---' + unp.slice(20),
      lookups: lookups(),
    })
    expect(found.problem).toBeUndefined()
    const [model, entry] = found.candidates
    expect(model?.mapping.structure).toMatchObject({
      id: 'AF-P04637-F1',
      kind: 'predicted',
    })
    // the three gap columns are not residues, so the row is whole
    expect(model?.mapping.segments).toEqual([
      {
        rowStart: 1,
        rowEnd: unp.length,
        structStart: 1,
        structEnd: unp.length,
      },
    ])
    expect(model?.mapping.rowLength).toBe(unp.length)

    expect(entry?.mapping.structure).toMatchObject({
      id: '1TUP',
      asymId: 'X',
      url: 'https://files.rcsb.org/download/1TUP.cif',
    })
    // row residue 94 is the first residue of the construct, label_seq_id 1
    expect(entry?.mapping.segments).toEqual([
      { rowStart: 94, rowEnd: 312, structStart: 1, structEnd: 219 },
    ])
  })

  test('a row that is not its named entry gets a problem and no candidates', async () => {
    const found = await findStructures({
      rowName: 'P04637',
      rowSequence: 'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      lookups: lookups(),
    })
    expect(found.candidates).toEqual([])
    expect(found.problem).toContain('does not match P04637')
  })

  test('a row with no accession says so before any request', async () => {
    const never = () => Promise.reject(new Error('no request expected'))
    const found = await findStructures({
      rowName: 'Human',
      rowSequence: unp,
      lookups: {
        alphaFoldModels: never,
        experimental: never,
        pdbEntry: never,
        canonicalSequence: never,
        labelChain: never,
        resolveAccession: never,
      },
    })
    expect(found.candidates).toEqual([])
    expect(found.problem).toContain('no UniProt accession')
  })

  test('names the structure chain by its label id and says so', async () => {
    const found = await findStructures({
      rowName: 'P04637',
      rowSequence: unp,
      lookups: lookups(),
    })
    const [model, entry] = found.candidates
    expect(model?.mapping.structure.asymIdKind).toBe('label')
    expect(entry?.mapping.structure).toMatchObject({
      asymId: 'X',
      asymIdKind: 'label',
    })
  })

  test('falls back to the author id, marked as such, when RCSB gives no label id', async () => {
    const found = await findStructures({
      rowName: 'P04637',
      rowSequence: unp,
      lookups: lookups({ labelChain: () => Promise.resolve(undefined) }),
    })
    expect(found.candidates[1]?.mapping.structure).toMatchObject({
      asymId: 'A',
      asymIdKind: 'auth',
    })
  })

  test('maps no PDB entry when only an isoform model exists', async () => {
    const found = await findStructures({
      rowName: 'P04637',
      rowSequence: unp,
      lookups: lookups({
        alphaFoldModels: () =>
          Promise.resolve([
            {
              accession: 'P04637-2',
              url: 'https://alphafold.ebi.ac.uk/files/AF-P04637-2-F1-model_v6.cif',
              sequence: unp,
            },
          ]),
      }),
    })
    expect(found.candidates.map(c => c.kind)).toEqual(['predicted'])
    expect(found.problem).toContain('isoform')
  })

  test('keeps the AlphaFold candidate when the RCSB lookup throws', async () => {
    const found = await findStructures({
      rowName: 'P04637',
      rowSequence: unp,
      lookups: lookups({
        experimental: () => Promise.reject(new Error('RCSB 503')),
      }),
    })
    expect(found.candidates.map(c => c.kind)).toEqual(['predicted'])
    expect(found.problem).toContain('RCSB 503')
  })

  test('maps the PDB entries through the UniProt sequence when AlphaFold DB has no model', async () => {
    const found = await findStructures({
      rowName: 'P04637',
      rowSequence: unp,
      lookups: lookups({
        alphaFoldModels: () => Promise.resolve([]),
        canonicalSequence: () => Promise.resolve(unp),
      }),
    })
    expect(found.problem).toBeUndefined()
    expect(found.candidates.map(c => c.mapping.structure.id)).toEqual(['1TUP'])
    expect(found.candidates[0]?.mapping.segments).toEqual([
      { rowStart: 94, rowEnd: 312, structStart: 1, structEnd: 219 },
    ])
  })

  test('says why when AlphaFold DB has no model and UniProt cannot be reached', async () => {
    const found = await findStructures({
      rowName: 'P04637',
      rowSequence: unp,
      lookups: lookups({
        alphaFoldModels: () => Promise.resolve([]),
        canonicalSequence: () => Promise.reject(new Error('UniProt 503')),
      }),
    })
    expect(found.candidates).toEqual([])
    expect(found.problem).toContain('UniProt 503')
  })

  test('says so when neither AlphaFold DB nor the PDB has a structure', async () => {
    const found = await findStructures({
      rowName: 'P04637',
      rowSequence: unp,
      lookups: lookups({
        alphaFoldModels: () => Promise.resolve([]),
        canonicalSequence: () => Promise.resolve(unp),
        experimental: () => Promise.resolve([]),
      }),
    })
    expect(found.candidates).toEqual([])
    expect(found.problem).toContain('no PDB entry')
  })

  test('a failed PDB entry drops that entry and keeps the others', async () => {
    const found = await findStructures({
      rowName: 'P04637',
      rowSequence: unp,
      lookups: lookups({ pdbEntry: () => Promise.reject(new Error('500')) }),
    })
    expect(found.candidates.map(c => c.kind)).toEqual(['predicted'])
  })
})

describe('names that resolve to an accession', () => {
  test('classifies entry names and RefSeq ids, dropping the version', () => {
    expect(identifiersOfRowName('HBA_HUMAN/1-142')).toEqual([
      { kind: 'entryName', value: 'HBA_HUMAN' },
    ])
    expect(
      identifiersOfRowName('NP_000549.1 hemoglobin subunit alpha'),
    ).toEqual([{ kind: 'xref', value: 'NP_000549' }])
    expect(identifiersOfRowName('Human')).toEqual([])
    expect(canFindStructures('NP_000549.1')).toBe(true)
    expect(canFindStructures('sp|P04637|P53_HUMAN')).toBe(true)
    expect(canFindStructures('Human')).toBe(false)
  })

  test('takes the database ids p2s_mapper recognizes and not a shared WP_ protein', () => {
    expect(identifiersOfRowName('ENSP00000269305')).toEqual([
      { kind: 'xref', value: 'ENSP00000269305' },
    ])
    expect(identifiersOfRowName('HGNC:11998')).toEqual([
      { kind: 'xref', value: 'HGNC:11998' },
    ])
    // WP_ names one sequence shared by every organism that encodes it
    expect(identifiersOfRowName('WP_000135199.1')).toEqual([])
    expect(canFindStructures('WP_000135199.1')).toBe(false)
  })

  test('looks the accession up, and says which name it came from', async () => {
    const asked: string[] = []
    const found = await findStructures({
      rowName: 'NP_000549.1',
      rowSequence: unp,
      lookups: lookups({
        resolveAccession: id => {
          asked.push(`${id.kind}:${id.value}`)
          return Promise.resolve('P04637')
        },
      }),
    })
    expect(asked).toEqual(['xref:NP_000549'])
    expect(found.accession).toBe('P04637')
    expect(found.resolvedFrom).toBe('NP_000549')
    expect(found.candidates.length).toBeGreaterThan(0)
  })

  test('does not look up a row that already names an accession', async () => {
    const found = await findStructures({
      rowName: 'sp|P04637|P53_HUMAN',
      rowSequence: unp,
      lookups: lookups({
        resolveAccession: () => Promise.reject(new Error('no lookup expected')),
      }),
    })
    expect(found.resolvedFrom).toBeUndefined()
    expect(found.candidates.length).toBeGreaterThan(0)
  })

  test('reports a name UniProt does not know', async () => {
    const found = await findStructures({
      rowName: 'ZZZZ_HUMAN',
      rowSequence: unp,
      lookups: lookups(),
    })
    expect(found.candidates).toEqual([])
    expect(found.problem).toContain('UniProt has no entry for ZZZZ_HUMAN')
  })

  test('reports a failed lookup as unreachable, not as unknown', async () => {
    const found = await findStructures({
      rowName: 'HBA_HUMAN',
      rowSequence: unp,
      lookups: lookups({
        resolveAccession: () =>
          Promise.reject(new Error('UniProt answered 503')),
      }),
    })
    expect(found.problem).toContain('could not be reached')
  })

  test('refuses a resolved entry the row does not match', async () => {
    const found = await findStructures({
      rowName: 'HBA_HUMAN',
      rowSequence: 'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      lookups: lookups({ resolveAccession: () => Promise.resolve('P04637') }),
    })
    expect(found.candidates).toEqual([])
    expect(found.problem).toContain(
      'does not match P04637, which HBA_HUMAN names',
    )
  })
})
