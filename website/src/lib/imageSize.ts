import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Reads the intrinsic pixel dimensions of a PNG under public/media at build
// time, so figures can carry real width/height attributes and the browser
// reserves the correct space at the native aspect ratio (no distortion, no
// layout shift). PNG stores width/height as big-endian uint32 in the IHDR
// chunk, at byte offsets 16 and 20 after the 8-byte signature. Resolved from
// the project root (cwd during build), since bundling relocates import.meta.
export function pngSize(filename: string) {
  const buf = readFileSync(join(process.cwd(), 'public/media', filename))
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}
