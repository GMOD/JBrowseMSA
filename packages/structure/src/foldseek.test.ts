import { parseFoldseekResult } from 'p2s_mapper'
import { describe, expect, test } from 'vitest'

import { parsePdbCaCoordinates } from './cif.ts'
import { foldseekCandidates } from './foldseek.ts'

// a target of 6 residues; the query starts 1 residue in and skips one target
// residue (a gap in the query), so numbering must come from the alignment
const hits = (overrides: Record<string, unknown> = {}) => ({
  results: [
    {
      db: 'afdb-swissprot',
      alignments: [
        [
          {
            target: 'AF-P69907-F1-model_v6 Hemoglobin subunit alpha',
            seqId: 100,
            eval: 1e-18,
            qStartPos: 1,
            qEndPos: 4,
            dbStartPos: 2,
            dbEndPos: 6,
            qAln: 'AC-DE',
            dbAln: 'ACGDE',
            tCa: '1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6',
            tSeq: 'MACGDE',
            taxName: 'Homo sapiens',
            ...overrides,
          },
        ],
      ],
    },
    {
      db: 'pdb100',
      alignments: [
        [
          {
            target: '1c7c-assembly1.cif.gz_A deoxy hemoglobin',
            seqId: 98.5,
            eval: 2e-17,
            qStartPos: 1,
            qEndPos: 5,
            dbStartPos: 3,
            dbEndPos: 7,
            qAln: 'ACDEF',
            dbAln: 'ACDEF',
            tCa: '1,0,0,2,0,0,3,0,0,4,0,0,5,0,0,6,0,0,7,0,0',
            tSeq: 'GHACDEF',
            taxName: 'Homo sapiens',
          },
        ],
      ],
    },
  ],
})

const offline = () => Promise.reject(new Error('offline'))

// an assembly file whose chain A holds the trace's seven CAs as label_seq_id
// 3..9, moved `shift` Å along x
function assemblyCif(chain = 'A', shift = 0) {
  const atoms = [1, 2, 3, 4, 5, 6, 7].map(
    (x, i) =>
      `ATOM ${i + 1} C CA . GLY ${chain} 1 ${i + 3} ? ${x + shift} 0 0 1 ${chain} 1`,
  )
  return [
    'data_1C7C',
    'loop_',
    '_atom_site.group_PDB',
    '_atom_site.id',
    '_atom_site.type_symbol',
    '_atom_site.label_atom_id',
    '_atom_site.label_alt_id',
    '_atom_site.label_comp_id',
    '_atom_site.label_asym_id',
    '_atom_site.label_entity_id',
    '_atom_site.label_seq_id',
    '_atom_site.pdbx_PDB_ins_code',
    '_atom_site.Cartn_x',
    '_atom_site.Cartn_y',
    '_atom_site.Cartn_z',
    '_atom_site.pdbx_PDB_model_num',
    '_atom_site.auth_asym_id',
    '_atom_site.pdbx_formal_charge',
    ...atoms,
    '#',
  ].join('\n')
}

describe('foldseekCandidates', () => {
  test('numbers an AlphaFold hit by target position, through the query map', async () => {
    const [af] = await foldseekCandidates({
      rowName: 'row',
      rowSequence: 'ACDE',
      hits: parseFoldseekResult(hits()),
      fetchText: offline,
    })
    expect(af?.mapping.structure).toMatchObject({
      id: 'AF-P69907-F1',
      kind: 'predicted',
      asymId: 'A',
      asymIdKind: 'label',
      url: 'https://alphafold.ebi.ac.uk/files/AF-P69907-F1-model_v6.cif',
    })
    // query A,C then a gap then D,E on target 2,3,(4 skipped),5,6
    expect(af?.mapping.segments).toEqual([
      { rowStart: 1, rowEnd: 2, structStart: 2, structEnd: 3 },
      { rowStart: 3, rowEnd: 4, structStart: 5, structEnd: 6 },
    ])
    expect(af?.mapping.rowLength).toBe(4)
  })

  test('opens a PDB hit from its assembly file, numbered by label_seq_id', async () => {
    const read: string[] = []
    const found = await foldseekCandidates({
      rowName: 'row',
      rowSequence: 'ACDEF',
      hits: parseFoldseekResult(hits()),
      fetchText: url => {
        read.push(url)
        return Promise.resolve(assemblyCif())
      },
    })
    const pdb = found.find(c => c.kind === 'experimental')!
    expect(read).toEqual(['https://files.rcsb.org/download/1C7C-assembly1.cif'])
    expect(pdb.mapping.structure).toMatchObject({
      id: '1C7C-assembly1',
      asymId: 'A',
      asymIdKind: 'label',
      url: 'https://files.rcsb.org/download/1C7C-assembly1.cif',
    })
    // target residues 3..7 are the chain's third to seventh, label_seq_id 5..9
    expect(pdb.mapping.segments).toEqual([
      { rowStart: 1, rowEnd: 5, structStart: 5, structEnd: 9 },
    ])
  })

  test('falls back to the trace when no chain of the file matches it', async () => {
    const found = await foldseekCandidates({
      rowName: 'row',
      rowSequence: 'ACDEF',
      hits: parseFoldseekResult(hits()),
      fetchText: () => Promise.resolve(assemblyCif('A', 3)),
    })
    expect(
      found.find(c => c.kind === 'experimental')!.mapping.structure.id,
    ).toBe('1C7C_A (Foldseek)')
  })

  test('draws a PDB hit from its own CA trace when its file cannot be read', async () => {
    const found = await foldseekCandidates({
      rowName: 'row',
      rowSequence: 'ACDEF',
      hits: parseFoldseekResult(hits()),
      fetchText: offline,
    })
    const pdb = found.find(c => c.kind === 'experimental')!
    expect(pdb.mapping.structure.id).toBe('1C7C_A (Foldseek)')
    const url = pdb.mapping.structure.url!
    expect(url.startsWith('data:chemical/x-pdb')).toBe(true)
    const trace = parsePdbCaCoordinates(
      decodeURIComponent(url.slice(url.indexOf(',') + 1)),
    )!
    // target residue 3 is the first aligned one, and it is row residue 1
    expect(trace.label.get('A')?.get(3)).toEqual([3, 0, 0])
    expect(pdb.mapping.segments).toEqual([
      { rowStart: 1, rowEnd: 5, structStart: 3, structEnd: 7 },
    ])
  })

  test('maps a query that skipped non-standard residues back to the row', async () => {
    const [af] = await foldseekCandidates({
      fetchText: offline,
      rowName: 'row',
      // X is row residue 2, left out of the query, so query position 2 is row 3
      rowSequence: 'AXCDE',
      hits: parseFoldseekResult(
        hits({ qAln: 'ACDE', dbAln: 'ACDE', dbEndPos: 5 }),
      ),
    })
    expect(af?.mapping.segments).toEqual([
      { rowStart: 1, rowEnd: 1, structStart: 2, structEnd: 2 },
      { rowStart: 3, rowEnd: 5, structStart: 3, structEnd: 5 },
    ])
  })

  test('drops a hit whose alignment disagrees with its own positions', async () => {
    const found = await foldseekCandidates({
      rowName: 'row',
      rowSequence: 'ACDE',
      hits: parseFoldseekResult(hits({ qEndPos: 9 })),
      fetchText: offline,
    })
    expect(found.map(c => c.kind)).toEqual(['experimental'])
  })

  test('takes at most perDatabase hits from each database', async () => {
    const one = parseFoldseekResult(hits())
    const many = Array.from({ length: 6 }, () => one[0]!)
    expect(
      await foldseekCandidates({
        rowName: 'row',
        rowSequence: 'ACDE',
        hits: many,
        perDatabase: 2,
        fetchText: offline,
      }),
    ).toHaveLength(2)
  })
})
