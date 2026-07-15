import { describe, expect, it } from 'vitest'

import {
  type Vec3,
  backboneTubeStl,
  parseCaTrace,
  trianglesToStl,
} from './proteinStl'

// Two ATOM records (a CA and a non-CA), a second altLoc, and an ENDMDL guard so
// only the first model's first-altLoc CAs are read. Columns are the real PDB
// fixed layout.
const PDB = [
  'ATOM      1  N   MET A   1      10.000  10.000  10.000  1.00  0.00           N',
  'ATOM      2  CA  MET A   1      11.000  12.000  13.000  1.00  0.00           C',
  'ATOM      3  CA BMET A   1      99.000  99.000  99.000  0.50  0.00           C',
  'ATOM      4  CA  GLY A   2      14.000  16.000  18.000  1.00  0.00           C',
  'ENDMDL',
  'ATOM      5  CA  ALA A   3      20.000  20.000  20.000  1.00  0.00           C',
].join('\n')

// Read one 50-byte triangle record (12 floats after the normal) from binary STL.
function triangleAt(view: DataView, index: number): Vec3[] {
  const base = 84 + 50 * index + 12 // skip header, count, and this face normal
  return [0, 1, 2].map(v => {
    const o = base + v * 12
    return [
      view.getFloat32(o, true),
      view.getFloat32(o + 4, true),
      view.getFloat32(o + 8, true),
    ] as Vec3
  })
}

describe('parseCaTrace', () => {
  it('keeps only first-altLoc CA atoms before ENDMDL', () => {
    expect(parseCaTrace(PDB)).toEqual([
      [11, 12, 13],
      [14, 16, 18],
    ])
  })
})

describe('backboneTubeStl', () => {
  it('rejects a trace too short to sweep', () => {
    expect(() => backboneTubeStl([[0, 0, 0]])).toThrow(/too few residues/)
  })

  it('writes a valid binary STL: header, count, watertight tube + caps', () => {
    const segments = 8
    const points: Vec3[] = [
      [0, 0, 0],
      [10, 0, 0],
      [20, 0, 0],
    ]
    const stl = backboneTubeStl(points, { radius: 2, segments })
    const view = new DataView(stl.buffer)

    // sides: 2 triangles/quad * segments * (rings-1); caps: segments each end
    const sideTris = 2 * segments * (points.length - 1)
    const capTris = 2 * segments
    const count = view.getUint32(80, true)
    expect(count).toBe(sideTris + capTris)
    expect(stl.length).toBe(84 + 50 * count)

    // every ring vertex sits at `radius` from its backbone point in the plane
    // perpendicular to a straight backbone (here the x-axis), so x is on-axis
    const first = triangleAt(view, 0)
    for (const p of first) {
      expect(Math.hypot(p[1], p[2])).toBeCloseTo(2, 5)
    }
  })
})

describe('trianglesToStl', () => {
  it('computes a unit face normal from winding order', () => {
    const tri: [Vec3, Vec3, Vec3] = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]
    const view = new DataView(trianglesToStl([tri]).buffer)
    expect([
      view.getFloat32(84, true),
      view.getFloat32(88, true),
      view.getFloat32(92, true),
    ]).toEqual([0, 0, 1])
  })
})
