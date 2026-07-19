// Build a 3D-printable STL of a protein directly in the browser, keeping with
// the gene explorer's "nothing precomputed" design: the AlphaFold model is
// fetched by UniProt accession, its alpha-carbon (CA) trace is extracted, and a
// solid tube is swept along the backbone. The tube is the classic way to 3D
// print a protein fold — a single connected body a slicer can handle, versus a
// cloud of atom spheres that would need supports everywhere.
//
// The mesh is watertight: a ring of vertices at each CA, consecutive rings
// stitched into quads, and a fan cap at each terminus. Ring orientation uses
// rotation-minimizing frames (parallel transport) so the tube doesn't twist or
// pop when the backbone curves. Output is standard binary STL, matching the
// layout Mol*'s own exporter writes (80-byte header, uint32 triangle count,
// then 50 bytes/triangle: face normal + 3 vertices + a 2-byte attribute count).

export type Vec3 = readonly [number, number, number]

const alphafoldPdbUrl = (uniprotId: string) =>
  `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v6.pdb`

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const normalize = (a: Vec3): Vec3 => {
  const l = length(a)
  return l > 1e-9 ? scale(a, 1 / l) : [0, 0, 0]
}
const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x))

// Rodrigues' rotation of v about a unit axis by `angle`.
function rotateAbout(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const cru = cross(axis, v)
  const k = dot(axis, v) * (1 - c)
  return [
    v[0] * c + cru[0] * s + axis[0] * k,
    v[1] * c + cru[1] * s + axis[1] * k,
    v[2] * c + cru[2] * s + axis[2] * k,
  ]
}

// Alpha-carbon coordinates from a PDB, in order, first model / first altLoc
// only. PDB ATOM records are fixed-column: atom name at 12–16, x/y/z at
// 30–38/38–46/46–54, altLoc at 16 (0-based, end-exclusive slices).
export function parseCaTrace(pdb: string): Vec3[] {
  const points: Vec3[] = []
  let done = false
  for (const line of pdb.split('\n')) {
    if (!done) {
      if (line.startsWith('ENDMDL')) {
        done = true
      } else {
        const isCa =
          line.startsWith('ATOM') && line.slice(12, 16).trim() === 'CA'
        const altLoc = line[16]
        if (isCa && (altLoc === ' ' || altLoc === 'A')) {
          points.push([
            Number(line.slice(30, 38)),
            Number(line.slice(38, 46)),
            Number(line.slice(46, 54)),
          ])
        }
      }
    }
  }
  return points
}

// Unit tangent at each point (central difference, clamped at the ends).
function tangents(points: Vec3[]): Vec3[] {
  const last = points.length - 1
  return points.map((_p, i) =>
    normalize(sub(points[Math.min(last, i + 1)], points[Math.max(0, i - 1)])),
  )
}

// A unit vector perpendicular to t, from a reference axis that isn't parallel
// to it (so the cross product is well-conditioned).
function anyPerpendicular(t: Vec3): Vec3 {
  const ref: Vec3 = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  return normalize(cross(t, ref))
}

// Rotation-minimizing normals: carry the first normal along the curve by the
// same rotation that turns each tangent into the next, so the frame follows the
// backbone without accumulating twist.
function transportedNormals(t: Vec3[]): Vec3[] {
  const normals: Vec3[] = [anyPerpendicular(t[0])]
  for (let i = 1; i < t.length; i++) {
    const axis = cross(t[i - 1], t[i])
    const sin = length(axis)
    if (sin < 1e-9) {
      normals.push(normals[i - 1])
    } else {
      const angle = Math.acos(clamp(dot(t[i - 1], t[i]), -1, 1))
      normals.push(
        normalize(rotateAbout(normals[i - 1], scale(axis, 1 / sin), angle)),
      )
    }
  }
  return normals
}

// Ring of `segments` vertices of the given radius around each backbone point,
// laid in that point's (normal, binormal) plane.
function tubeRings(points: Vec3[], radius: number, segments: number): Vec3[][] {
  const t = tangents(points)
  const normals = transportedNormals(t)
  return points.map((p, i) => {
    const n = normals[i]
    const b = cross(t[i], n)
    return Array.from({ length: segments }, (_v, j) => {
      const theta = (2 * Math.PI * j) / segments
      const dir = add(scale(n, Math.cos(theta)), scale(b, Math.sin(theta)))
      return add(p, scale(dir, radius))
    })
  })
}

export interface TubeOptions {
  // tube radius in Ångströms; CA–CA spacing is ~3.8 Å, so the default overlaps
  // neighbouring rings into one solid rod. STL units are unitless — most slicers
  // read them as mm, making a ~50 Å protein a ~5 cm print.
  radius?: number
  // vertices per ring; more is rounder but heavier
  segments?: number
}

// Sweep a closed tube along the CA trace and return it as binary STL bytes.
export function backboneTubeStl(
  points: Vec3[],
  { radius = 2.5, segments = 12 }: TubeOptions = {},
): Uint8Array<ArrayBuffer> {
  if (points.length < 2) {
    throw new Error('Structure has too few residues to build a printable model')
  }
  const rings = tubeRings(points, radius, segments)
  const triangles: [Vec3, Vec3, Vec3][] = []

  // stitch neighbouring rings into two triangles per quad
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const k = (j + 1) % segments
      const a = rings[i][j]
      const b = rings[i][k]
      const c = rings[i + 1][j]
      const d = rings[i + 1][k]
      triangles.push([a, c, d], [a, d, b])
    }
  }

  // fan caps close the two ends so the body is watertight
  const cap = (ring: Vec3[], center: Vec3, outward: boolean) => {
    for (let j = 0; j < segments; j++) {
      const k = (j + 1) % segments
      triangles.push(
        outward ? [center, ring[j], ring[k]] : [center, ring[k], ring[j]],
      )
    }
  }
  cap(rings[0], points[0], false)
  cap(rings[rings.length - 1], points[points.length - 1], true)

  return trianglesToStl(triangles)
}

// Outward face normal of a triangle (zero for a degenerate one).
function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return normalize(cross(sub(b, a), sub(c, a)))
}

// Pack triangles into standard binary STL. Vertices aren't shared — each
// triangle carries its own three points and a recomputed normal, which is all
// the format stores.
export function trianglesToStl(
  triangles: [Vec3, Vec3, Vec3][],
  header = 'Backbone tube from AlphaFold - JBrowseMSA gene explorer',
): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(84 + 50 * triangles.length)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < header.length && i < 80; i++) {
    bytes[i] = header.charCodeAt(i) & 0x7f
  }
  view.setUint32(80, triangles.length, true)

  let offset = 84
  const writeVec = (v: Vec3) => {
    view.setFloat32(offset, v[0], true)
    view.setFloat32(offset + 4, v[1], true)
    view.setFloat32(offset + 8, v[2], true)
    offset += 12
  }
  for (const [a, b, c] of triangles) {
    writeVec(faceNormal(a, b, c))
    writeVec(a)
    writeVec(b)
    writeVec(c)
    offset += 2 // attribute byte count, left zero
  }
  return bytes
}

// Fetch a gene's AlphaFold model and return a printable STL of its backbone.
export async function fetchProteinStl(
  uniprotId: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const res = await fetch(alphafoldPdbUrl(uniprotId))
  if (!res.ok) {
    throw new Error(`AlphaFold structure unavailable (HTTP ${res.status})`)
  }
  return backboneTubeStl(parseCaTrace(await res.text()))
}
