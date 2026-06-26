import type { GFFRecord } from '../types.ts'

// decodeURIComponent throws on a stray '%' (common in unescaped GFF3 values);
// fall back to the raw value rather than aborting the whole parse
function safeDecode(val: string) {
  try {
    return decodeURIComponent(val)
  } catch {
    return val
  }
}

function parseAttributes(col9?: string): Record<string, string | undefined> {
  if (!col9) {
    return {}
  }
  return Object.fromEntries(
    col9
      .split(';')
      .map(f => f.trim())
      .filter(f => !!f)
      .map(f => {
        const eq = f.indexOf('=')
        const key = (eq === -1 ? f : f.slice(0, eq)).trim()
        const val = eq === -1 ? undefined : f.slice(eq + 1)
        // split on comma (the GFF3 multi-value separator) BEFORE decoding, so a
        // literal comma encoded as %2C survives the split and isn't mistaken
        // for a separator
        return [
          key,
          val
            ? val
                .split(',')
                .map(v => safeDecode(v).trim())
                .join(' ')
            : undefined,
        ]
      })
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
