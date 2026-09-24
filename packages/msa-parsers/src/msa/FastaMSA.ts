import BaseMSA from './BaseMSA.ts'
import { toRecords } from './fastaRecords.ts'

import type { FastaRecord } from './fastaRecords.ts'

export default class FastaMSA extends BaseMSA {
  private MSA: {
    seqdata: Record<string, string>
    colonNormalized: Record<string, string>
  }

  // explicit insertion-ordered ids: object key order reorders integer-like
  // keys (e.g. a numeric ">123" defline) to the front, scrambling row order
  private orderedNames: string[]

  constructor(input: string | FastaRecord[]) {
    super()
    const records = toRecords(input)
    const seqdata: Record<string, string> = Object.create(null)
    const colonNormalized: Record<string, string> = Object.create(null)

    for (const { id, seq } of records) {
      seqdata[id] = seq
      if (id.includes(':')) {
        colonNormalized[id.replaceAll(':', '_')] = id
      }
    }

    this.orderedNames = records.map(r => r.id)
    this.MSA = { seqdata, colonNormalized }
  }

  getMSA() {
    return this.MSA
  }

  getNames() {
    return this.orderedNames
  }

  getRow(name: string) {
    return (
      this.MSA.seqdata[name] ??
      this.MSA.seqdata[this.MSA.colonNormalized[name] ?? ''] ??
      ''
    )
  }
}
