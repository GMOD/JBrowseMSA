export interface FastaRecord {
  id: string
  seq: string
}

/**
 * Split FASTA-style text (shared by the FASTA and A3M parsers) into records.
 * The id is the defline up to the first space. A repeated id keeps the first
 * record: ids index the row data, so emitting the id twice would render a
 * phantom duplicate row showing the last record's residues.
 */
export function splitFastaRecords(text: string): FastaRecord[] {
  const records: FastaRecord[] = []
  const seen = new Set<string>()

  for (const entry of text.split('>')) {
    if (!/\S/.test(entry)) {
      continue
    }
    const newlineIdx = entry.indexOf('\n')
    if (newlineIdx === -1) {
      continue
    }
    const defLine = entry.slice(0, newlineIdx).replace(/\r$/, '')
    const spaceIdx = defLine.indexOf(' ')
    const id = spaceIdx === -1 ? defLine : defLine.slice(0, spaceIdx)
    if (!id || seen.has(id)) {
      continue
    }
    seen.add(id)
    records.push({ id, seq: entry.slice(newlineIdx + 1).replaceAll(/\s/g, '') })
  }

  return records
}
