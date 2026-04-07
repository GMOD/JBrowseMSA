import { colord, extend } from 'colord'
import namesPlugin from 'colord/plugins/names'

import type { Theme } from '@mui/material'

extend([namesPlugin])

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

export function len(a: { end: number; start: number }) {
  return a.end - a.start
}

// https://sonnhammer.sbc.su.se/Stockholm.html
// gaps can be a . or - in stockholm
export function isBlank(s?: string) {
  return s === '-' || s === '.'
}
