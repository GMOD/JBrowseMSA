export interface FastaRecord {
  id: string
  seq: string
}

// a `>` record, optionally after `#` header lines such as ColabFold's `#8\t1`
export function fastaSniff(text: string) {
  return /^(#.*\n)*>/.test(text)
}

/**
 * Split FASTA-style text (shared by the FASTA and A3M parsers) into records.
 *
 * A record starts at a `>` that begins a line, so a `>` inside a defline
 * (`x->y`, HGVS `c.1799T>A`) stays part of it, and anything before the first
 * record (ColabFold's `#8\t1` header) is skipped. The id is the defline up to
 * the first whitespace, tab included. A repeated id keeps the first record: ids
 * index the row data, so emitting the id twice would render a phantom duplicate
 * row showing the last record's residues.
 */
export function splitFastaRecords(text: string): FastaRecord[] {
  const records: FastaRecord[] = []
  const seen = new Set<string>()
  let current: { id: string; lines: string[] } | undefined

  const flush = () => {
    if (current && !seen.has(current.id)) {
      seen.add(current.id)
      records.push({
        id: current.id,
        seq: current.lines.join('').replaceAll(/\s/g, ''),
      })
    }
  }

  for (const line of text.split('\n')) {
    if (line.startsWith('>')) {
      flush()
      const id = /^>(\S*)/.exec(line)![1]!
      current = id ? { id, lines: [] } : undefined
    } else {
      current?.lines.push(line)
    }
  }
  flush()

  return records
}
