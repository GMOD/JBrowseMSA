import { colord, extend } from 'colord'
import a11yPlugin from 'colord/plugins/a11y'
import namesPlugin from 'colord/plugins/names'

import type { Theme } from '@mui/material'

extend([namesPlugin, a11yPlugin])

const contrastAdjustCache = new Map<string, string>()

// Adjusts a background-tile color until it meets WCAG AA (4.5:1) contrast
// against `bg`, so it can be used as letter text in letter-color mode.
// Darkens on light backgrounds, lightens on dark backgrounds.
export function adjustColorForContrast(color: string, bg: string): string {
  const cacheKey = `${color}|${bg}`
  const cached = contrastAdjustCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }
  let c = colord(color)
  if (!c.isReadable(bg)) {
    const bgIsDark = colord(bg).luminance() < 0.5
    for (let i = 0; i < 40 && !c.isReadable(bg); i++) {
      c = bgIsDark ? c.lighten(0.05) : c.darken(0.05)
    }
  }
  const result = c.toHex()
  contrastAdjustCache.set(cacheKey, result)
  return result
}

export function transform<T>(
  obj: Record<string, T>,
  cb: (arg0: [string, T]) => [string, T],
) {
  return Object.fromEntries(Object.entries(obj).map(cb))
}

export function colorContrast(
  colorScheme: Record<string, string>,
  theme: Theme,
) {
  return transform(colorScheme, ([letter, color]) => [
    letter,
    theme.palette.getContrastText(colord(color).toHex()),
  ])
}

export function skipBlanks(blanks: number[], str: string) {
  if (blanks.length === 0) {
    return str
  }
  const chunks = []
  let lastEnd = 0
  for (const blankIdx of blanks) {
    if (blankIdx > lastEnd) {
      chunks.push(str.slice(lastEnd, blankIdx))
    }
    lastEnd = blankIdx + 1
  }
  if (lastEnd < str.length) {
    chunks.push(str.slice(lastEnd))
  }
  return chunks.join('')
}

export function computeRowInsertions(blanks: number[], seq: string) {
  const insertions: { pos: number; letters: string }[] = []
  const blanksLen = blanks.length
  let displayPos = 0
  let blankIdx = 0
  let currentInsertPos = -1
  let letterChars: string[] = []
  for (let i = 0; i < seq.length; i++) {
    if (blankIdx < blanksLen && blanks[blankIdx] === i) {
      // bit trick: (code - 45) >>> 0 <= 1 checks for '-' (45) or '.' (46)
      if (!((seq.charCodeAt(i) - 45) >>> 0 <= 1)) {
        if (currentInsertPos === displayPos) {
          letterChars.push(seq[i]!)
        } else {
          if (letterChars.length > 0) {
            insertions.push({
              pos: currentInsertPos,
              letters: letterChars.join(''),
            })
          }
          currentInsertPos = displayPos
          letterChars = [seq[i]!]
        }
      }
      blankIdx++
    } else {
      displayPos++
    }
  }
  if (letterChars.length > 0) {
    insertions.push({ pos: currentInsertPos, letters: letterChars.join('') })
  }
  return insertions
}

export function len(a: { end: number; start: number }) {
  return a.end - a.start
}

// https://sonnhammer.sbc.su.se/Stockholm.html
// gaps can be a . or - in stockholm
export function isBlank(s?: string) {
  return s === '-' || s === '.'
}
