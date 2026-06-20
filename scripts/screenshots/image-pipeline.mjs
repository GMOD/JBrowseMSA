/**
 * PNG post-processing for the screenshot generator: optimize, diff against the
 * committed image, and commit only when the content actually changed.
 *
 * A regen re-renders every spec, but an unchanged spec re-renders pixel-identical
 * (rendering is deterministic), so writing them all back would churn the whole
 * docs/media dir on every commit. A freshly captured PNG therefore replaces the
 * committed one only when it differs by more than `diffThreshold` of its pixels.
 *
 * Uses the system ImageMagick (`compare`/`identify`) and `pngquant`, which are
 * already present on the doc-building machine. Each is best-effort: a missing
 * tool degrades gracefully (treat as changed / skip optimization) rather than
 * failing the run.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

// Fraction in [0,1] of pixels that differ (fuzz-tolerant), or null when the two
// images are different sizes / the comparison couldn't run (treated as changed).
export function pngDiffFraction(a, b) {
  // `compare` writes the metric to stderr and exits 0 (within fuzz), 1
  // (differ), or 2 (error, e.g. dimension mismatch / tool missing).
  const cmp = spawnSync(
    'compare',
    ['-metric', 'AE', '-fuzz', '5%', a, b, 'null:'],
    { encoding: 'utf8' },
  )
  if (cmp.error || cmp.status === 2) {
    return null
  }
  const ae = Number.parseFloat((cmp.stderr || '').trim().split(/\s+/)[0] ?? '')
  if (!Number.isFinite(ae)) {
    return null
  }
  const id = spawnSync('identify', ['-format', '%w %h', a], {
    encoding: 'utf8',
  })
  const [w, h] = (id.stdout || '').trim().split(/\s+/).map(Number)
  const total = (w ?? 0) * (h ?? 0)
  return total > 0 ? ae / total : null
}

// copyFileSync (not rename) because the temp dir and docs/media may be on
// different filesystems.
function moveIntoPlace(tmpPath, outputPath) {
  fs.copyFileSync(tmpPath, outputPath)
  fs.rmSync(tmpPath, { force: true })
}

// Move a freshly captured PNG into place only when its content actually changed
// (or with force / for a brand-new spec), so a regen doesn't rewrite every PNG.
export function commitScreenshot(
  tmpPath,
  outputPath,
  name,
  { force, diffThreshold },
) {
  const isNew = !fs.existsSync(outputPath)
  if (force || isNew) {
    moveIntoPlace(tmpPath, outputPath)
    console.log(`  ✓ ${name}.png${isNew ? ' (new)' : ''}`)
  } else {
    const frac = pngDiffFraction(tmpPath, outputPath)
    if (frac !== null && frac < diffThreshold) {
      fs.rmSync(tmpPath, { force: true })
      console.log(
        `  ≈ ${name}.png (kept; ${(frac * 100).toFixed(3)}% < ${diffThreshold * 100}% threshold)`,
      )
    } else {
      moveIntoPlace(tmpPath, outputPath)
      const detail =
        frac === null ? 'resized' : `${(frac * 100).toFixed(2)}% diff`
      console.log(`  ✓ ${name}.png (updated, ${detail})`)
    }
  }
}

// Lossily quantize a PNG in place with pngquant. These captures are flat-color
// UI screenshots with small palettes, so quantization shrinks them ~50% with no
// perceptible quality loss — worth it for a static site served over the network.
// `--nofs` disables Floyd-Steinberg dithering, whose error-diffusion noise would
// otherwise scatter run-to-run across translucent UI chrome and defeat the
// content-stable diff gate. Best-effort: leave the original untouched if
// pngquant is missing or the result would not be smaller.
export function optimizePng(file) {
  const res = spawnSync(
    'pngquant',
    ['--nofs', '--force', '--skip-if-larger', '--output', file, file],
    { encoding: 'utf8' },
  )
  if (res.error) {
    console.warn(`    (pngquant unavailable, leaving ${file} unoptimized)`)
  }
}
