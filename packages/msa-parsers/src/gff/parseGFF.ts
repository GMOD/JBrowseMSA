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

// InterProScan quotes some of its values (Ontology_term="GO:0008652",
// Dbxref="InterPro:IPR001048"), and the quotes are not part of the term
function unquote(val: string) {
  return val.replace(/^"(.*)"$/, '$1')
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
                .map(v => unquote(safeDecode(v).trim()))
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
  const lines: string[] = []
  for (const raw of str.split('\n')) {
    const line = raw.trim()
    // InterProScan appends the sequences it scanned; every line past this is
    // FASTA, and reading it as features gave rows named ">P51587"
    if (line.startsWith('##FASTA')) {
      break
    }
    // a feature is nine tab-separated columns, eight of them mandatory; a
    // FASTA line in a file that omitted the ##FASTA directive is one
    if (line && !line.startsWith('#') && line.split('\t').length >= 8) {
      lines.push(line)
    }
  }
  return lines.map(f => {
    const parts = f.split('\t')
    const [seq_id, source, type, start, end, score, strand, phase] = parts
    const col9 = parts[8]

    // attributes first, so a column-9 key colliding with a core column (e.g.
    // "start=") can't turn a number field into a string
    return {
      ...parseAttributes(col9),
      seq_id: seq_id ?? '',
      source: source ?? '',
      type: type ?? '',
      start: Number(start) || 0,
      end: Number(end) || 0,
      score: Number(score) || 0,
      strand: strand ?? '.',
      phase: phase ?? '.',
    }
  })
}
