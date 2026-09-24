import BaseMSA from './BaseMSA.ts'
import { toRecords } from './fastaRecords.ts'

import type { FastaRecord } from './fastaRecords.ts'

export default class FastaMSA extends BaseMSA {
  // Newick tools write a colon in a name as an underscore
  private colonNormalized = new Map<string, string>()

  constructor(input: string | FastaRecord[]) {
    const records = toRecords(input)
    super(records.map(r => [r.id, r.seq]))
    for (const { id } of records) {
      if (id.includes(':')) {
        this.colonNormalized.set(id.replaceAll(':', '_'), id)
      }
    }
  }

  getRow(name: string) {
    return (
      this.rows.get(name) ??
      this.rows.get(this.colonNormalized.get(name) ?? '') ??
      ''
    )
  }
}
