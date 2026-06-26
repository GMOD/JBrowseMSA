import BaseMSA from './BaseMSA.ts'

export default class FastaMSA extends BaseMSA {
  private MSA: {
    seqdata: Record<string, string>
    colonNormalized: Record<string, string>
  }

  // explicit insertion-ordered ids: object key order reorders integer-like
  // keys (e.g. a numeric ">123" defline) to the front, scrambling row order
  private orderedNames: string[] = []

  constructor(text: string) {
    super()
    const seqdata: Record<string, string> = {}
    const colonNormalized: Record<string, string> = {}
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
      if (id) {
        seqdata[id] = entry.slice(newlineIdx + 1).replaceAll(/\s/g, '')
        this.orderedNames.push(id)
        if (id.includes(':')) {
          colonNormalized[id.replaceAll(':', '_')] = id
        }
      }
    }
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

  getWidth() {
    const name = this.orderedNames[0]
    return name === undefined ? 0 : this.getRow(name).length
  }
}
