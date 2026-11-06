import { describe, expect, test } from 'vitest'

import {
  meanColumnDistances,
  superposeOnColumns,
} from './alignmentSuperposition.ts'
import { caChain, parseCaCoordinates } from './cif.ts'
import { applyMatrix, distance, fitRigid } from './superpose.ts'
import { distanceTrack, superposeRows } from './superposeRows.ts'

import type { Vec3 } from './cif.ts'
import type { MsaViewModel } from 'react-msaview'

// a helix-like backbone with a few kinks, so no three points are collinear
const backbone: Vec3[] = Array.from({ length: 24 }, (_, i) => [
  3 * Math.cos(i * 1.7) + 0.3 * i,
  3 * Math.sin(i * 1.7) - 0.2 * i,
  1.5 * i + Math.sin(i * 0.9),
])

function rotateZ([x, y, z]: Vec3, angle: number): Vec3 {
  return [
    x * Math.cos(angle) - y * Math.sin(angle),
    x * Math.sin(angle) + y * Math.cos(angle),
    z,
  ]
}

function moved(points: Vec3[]): Vec3[] {
  return points.map(p => {
    // a cyclic permutation of the axes is a proper rotation, a swap of two
    // is a reflection and no rigid motion
    const [x, y, z] = rotateZ(p, 0.8)
    return [z + 11, x - 4, y + 7] as Vec3
  })
}

describe('fitRigid', () => {
  test('recovers a rotation and translation exactly', () => {
    const target = moved(backbone)
    const fit = fitRigid(backbone, target)!
    expect(fit.rmsd).toBeLessThan(1e-6)
    for (const [i, p] of backbone.entries()) {
      expect(distance(applyMatrix(fit.matrix, p), target[i]!)).toBeLessThan(
        1e-6,
      )
    }
  })

  test('takes no fit from fewer than three points', () => {
    expect(fitRigid(backbone.slice(0, 2), backbone.slice(0, 2))).toBeUndefined()
  })
})

describe('superposeOnColumns', () => {
  const columns = (points: Vec3[], skip = -1) =>
    new Map(points.flatMap((p, i) => (i === skip ? [] : [[i * 2, p] as const])))

  test('reports a displaced residue as a distance after the fit', () => {
    const other = moved(backbone)
    other[10] = [other[10]![0] + 6, other[10]![1], other[10]![2]]
    const { fits } = superposeOnColumns(
      { row: 'ref', atColumn: columns(backbone) },
      [{ row: 'other', atColumn: columns(other) }],
      column => column !== 20,
    )
    const fit = fits[0]!
    expect(fit.fitted).toBe(23)
    expect(fit.rmsd).toBeLessThan(1e-6)
    expect(fit.distances.get(20)).toBeCloseTo(6, 3)
    expect(fit.distances.get(2)).toBeLessThan(1e-6)
  })

  test('sets aside a pair far from the fit and fits the core again', () => {
    const other = moved(backbone)
    other[10] = [other[10]![0] + 8, other[10]![1], other[10]![2]]
    const reference = { row: 'ref', atColumn: columns(backbone) }
    const target = [{ row: 'other', atColumn: columns(other) }]

    const refined = superposeOnColumns(reference, target).fits[0]!
    expect(refined.considered).toBe(24)
    expect(refined.fitted).toBe(23)
    expect(refined.rmsd).toBeLessThan(1e-6)
    expect(refined.distances.get(20)).toBeCloseTo(8, 3)

    const plain = superposeOnColumns(reference, target, () => true, false)
      .fits[0]!
    expect(plain.fitted).toBe(24)
    expect(plain.rmsd).toBeGreaterThan(0.5)
  })

  test('keeps a floor of pairs so a loose alignment cannot empty the fit', () => {
    // every pair off by a different amount: nothing may be thrown away
    const other = moved(backbone).map(
      ([x, y, z], i) => [x + 3 * Math.sin(i), y, z + 3 * Math.cos(i)] as Vec3,
    )
    const { fits } = superposeOnColumns(
      { row: 'ref', atColumn: columns(backbone) },
      [{ row: 'other', atColumn: columns(other) }],
    )
    expect(fits[0]!.fitted).toBeGreaterThanOrEqual(
      Math.ceil(fits[0]!.considered * 0.4),
    )
  })

  test('uses only the columns both rows have', () => {
    const { fits } = superposeOnColumns(
      { row: 'ref', atColumn: columns(backbone, 3) },
      [{ row: 'other', atColumn: columns(moved(backbone), 5) }],
    )
    expect(fits[0]!.fitted).toBe(22)
    expect(fits[0]!.distances.has(6)).toBe(false)
    expect(fits[0]!.distances.has(10)).toBe(false)
  })

  test('skips a row that shares under three columns with a reason', () => {
    const { fits, skipped } = superposeOnColumns(
      { row: 'ref', atColumn: columns(backbone) },
      [{ row: 'few', atColumn: columns(backbone.slice(0, 2)) }],
    )
    expect(fits).toEqual([])
    expect(skipped[0]?.row).toBe('few')
  })

  test('meanColumnDistances averages over rows and is 0 where none has a CA', () => {
    const near = moved(backbone)
    const far = moved(backbone)
    far[2] = [far[2]![0] + 4, far[2]![1], far[2]![2]]
    const { fits } = superposeOnColumns(
      { row: 'ref', atColumn: columns(backbone) },
      [
        { row: 'a', atColumn: columns(near) },
        { row: 'b', atColumn: columns(far) },
      ],
      column => column !== 4,
    )
    expect(meanColumnDistances(fits, [0, 4, 99])).toEqual([0, 2, 0])
  })
})

const cif = `data_x
loop_
_atom_site.group_PDB
_atom_site.id
_atom_site.label_atom_id
_atom_site.label_alt_id
_atom_site.label_comp_id
_atom_site.label_asym_id
_atom_site.label_seq_id
_atom_site.Cartn_x
_atom_site.Cartn_y
_atom_site.Cartn_z
_atom_site.auth_asym_id
_atom_site.pdbx_PDB_model_num
ATOM 1 N . MET A 1 1.0 2.0 3.0 H 1
ATOM 2 CA . MET A 1 1.5 2.5 3.5 H 1
ATOM 3 CA . GLY A 2 4.0 5.0 6.0 H 1
ATOM 4 CA B ALA A 3 7.0 8.0 9.0 H 1
ATOM 5 CA A ALA A 3 7.5 8.5 9.5 H 1
HETATM 6 CA . CA B . 9.0 9.0 9.0 K 1
ATOM 7 CA . MET A 1 100.0 100.0 100.0 H 2
#
`

describe('parseCaCoordinates', () => {
  test('files CA atoms of the first model under label and author chain', () => {
    const { label, auth } = parseCaCoordinates(cif)!
    expect([...label.keys()]).toEqual(['A'])
    expect([...auth.keys()]).toEqual(['H'])
    expect(label.get('A')?.get(1)).toEqual([1.5, 2.5, 3.5])
    expect(auth.get('H')?.get(2)).toEqual([4, 5, 6])
  })

  test('takes the first alternate location and skips HETATM calcium', () => {
    const { label } = parseCaCoordinates(cif)!
    expect(label.get('A')?.get(3)).toEqual([7.5, 8.5, 9.5])
    expect(label.has('B')).toBe(false)
  })

  test('counts a modified residue but not a calcium ion', () => {
    const withMse = `${cif.replace(
      '#\n',
      'HETATM 8 CA . MSE A 4 1.0 1.0 1.0 H 1\nHETATM 9 CA . CA B . 2.0 2.0 2.0 K 1\n#\n',
    )}`
    const { label } = parseCaCoordinates(withMse)!
    expect(label.get('A')?.get(4)).toEqual([1, 1, 1])
    expect(label.has('B')).toBe(false)
  })

  test('skips a CA whose coordinate is not a number', () => {
    const broken = cif.replace('1.5 2.5 3.5', '? ? ?')
    expect(parseCaCoordinates(broken)!.label.get('A')?.has(1)).toBe(false)
  })

  test('files a chain under label and author as one map', () => {
    const { label, auth } = parseCaCoordinates(cif)!
    expect(label.get('A')).toBe(auth.get('H'))
  })

  test('returns undefined for a file with no CA', () => {
    expect(
      parseCaCoordinates('HEADER    PDB\nATOM      1  N   MET'),
    ).toBeUndefined()
    expect(parseCaCoordinates(cif.replaceAll(' CA ', ' N  '))).toBeUndefined()
  })
})

// two protein chains whose ids cross: label A is author B, label B is author A
const crossed = cif
  .replace(/ATOM [2-5] .*\n/g, '')
  .replace(
    'ATOM 1 N . MET A 1 1.0 2.0 3.0 H 1\n',
    'ATOM 1 CA . MET A 1 1.0 1.0 1.0 B 1\nATOM 2 CA . MET B 1 2.0 2.0 2.0 A 1\n',
  )

describe('caChain', () => {
  const coordinates = parseCaCoordinates(crossed)!

  test('reads the id space the mapping names', () => {
    expect(caChain(coordinates, 'A', 'label')?.get(1)).toEqual([1, 1, 1])
    expect(caChain(coordinates, 'A', 'auth')?.get(1)).toEqual([2, 2, 2])
  })

  test('reads an unset kind as the label id first', () => {
    expect(caChain(coordinates, 'A', undefined)?.get(1)).toEqual([1, 1, 1])
  })

  test('falls through to the author id when no labelled chain has a CA', () => {
    const parsed = parseCaCoordinates(cif)!
    expect(caChain(parsed, 'H', undefined)).toBe(parsed.auth.get('H'))
  })

  test('takes the only chain for a mapping that names none', () => {
    expect(
      caChain(parseCaCoordinates(cif)!, undefined, undefined),
    ).toBeDefined()
    expect(caChain(coordinates, undefined, undefined)).toBeUndefined()
  })
})

function cifOf(points: Vec3[]) {
  return [
    'data_x',
    'loop_',
    ...[
      'group_PDB',
      'label_atom_id',
      'label_comp_id',
      'label_asym_id',
      'label_seq_id',
      'Cartn_x',
      'Cartn_y',
      'Cartn_z',
    ].map(c => `_atom_site.${c}`),
    ...points.map(([x, y, z], i) => `ATOM CA ALA A ${i + 1} ${x} ${y} ${z}`),
    '#',
  ].join('\n')
}

// rows of 24 residues and no gaps, each mapped 1:1 onto its own structure
function fakeModel(rows: Record<string, string | undefined>) {
  const n = backbone.length
  return {
    mappedStructures: Object.entries(rows).map(([row, url]) => ({
      row,
      structure: { id: `S-${row}`, asymId: 'A', asymIdKind: 'label', url },
    })),
    seqPosIndex: () => Int32Array.from({ length: n }, (_, i) => i),
    structureResidue: (row: string, seqPos: number, id: string) =>
      id === `S-${row}` && seqPos <= n ? { position: seqPos } : undefined,
  } as unknown as MsaViewModel
}

describe('superposeRows', () => {
  const files: Record<string, string> = {
    'ref.cif': cifOf(backbone),
    'moved.cif': cifOf(moved(backbone)),
  }
  const fetchText = (url: string) =>
    files[url] === undefined
      ? Promise.reject(new Error(`${url}: HTTP 404`))
      : Promise.resolve(files[url])
  const targets = (rows: string[]) =>
    rows.map(row => ({ row, structureId: `S-${row}` }))

  test('fits the others onto the reference', async () => {
    const model = fakeModel({ ref: 'ref.cif', other: 'moved.cif' })
    const result = await superposeRows({
      model,
      targets: targets(['ref', 'other']),
      fetchText,
    })
    expect(result.fits[0]?.rmsd).toBeLessThan(1e-6)
    expect(result.distanceValues).toHaveLength(backbone.length)
  })

  test('fits on the 1-based columns of a selection, the last three here', async () => {
    const result = await superposeRows({
      model: fakeModel({ ref: 'ref.cif', other: 'moved.cif' }),
      targets: targets(['ref', 'other']),
      selection: { start: 22, end: 24 },
      fetchText,
    })
    expect(result.fits[0]?.considered).toBe(3)
  })

  test('skips a row whose file fails to load and fits the rest', async () => {
    const model = fakeModel({
      ref: 'ref.cif',
      gone: 'missing.cif',
      other: 'moved.cif',
    })
    const result = await superposeRows({
      model,
      targets: targets(['ref', 'gone', 'other']),
      fetchText,
    })
    expect(result.fits.map(f => f.row)).toEqual(['other'])
    expect(result.skipped).toEqual([
      { row: 'gone', reason: 'missing.cif: HTTP 404' },
    ])
  })

  test('throws when the reference fails to load', async () => {
    const model = fakeModel({ gone: 'missing.cif', other: 'moved.cif' })
    await expect(
      superposeRows({ model, targets: targets(['gone', 'other']), fetchText }),
    ).rejects.toThrow('HTTP 404')
  })
})

describe('distanceTrack', () => {
  test('scales the bar to the largest distance, rounded up', () => {
    const track = distanceTrack({
      referenceId: 'AF-P69905-F1',
      referenceRow: 'HBA_HUMAN',
      matrices: {},
      fits: [],
      distanceValues: [0.4, 7.2, Number.NaN, 2],
      skipped: [],
    })
    expect(track).toMatchObject({
      id: 'ca-distance',
      kind: 'bar',
      row: 'HBA_HUMAN',
      encoding: { y: { domainMax: 8 } },
      name: 'CA distance to HBA_HUMAN (0–8 Å)',
    })
  })
})
