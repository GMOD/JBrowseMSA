import type { GFFRecord } from '../types'

function parseAttributes(col9?: string): Record<string, string | undefined> {
  if (!col9) {
    return {}
  }
  return Object.fromEntries(
    col9
      .split(';')
      .map(f => f.trim())
      .filter(f => !!f)
      .map(f => f.split('='))
      .map(([key, val]) => [
        key?.trim() ?? '',
        val ? decodeURIComponent(val).trim().split(',').join(' ') : undefined,
      ])
      .filter(([key]) => key !== ''),
  )
}

export function parseGFF(str?: string): GFFRecord[] {
  if (!str) {
    return []
  }
  return str
    .split('\n')
    .map(f => f.trim())
    .filter(f => !!f && !f.startsWith('#'))
    .map(f => {
      const parts = f.split('\t')
      const [seq_id, source, type, start, end, score, strand, phase] = parts
      const col9 = parts[8]

      return {
        seq_id: seq_id ?? '',
        source: source ?? '',
        type: type ?? '',
        start: Number(start) || 0,
        end: Number(end) || 0,
        score: Number(score) || 0,
        strand: strand ?? '.',
        phase: phase ?? '.',
        ...parseAttributes(col9),
      }
    })
}
