import BaseMSA from './BaseMSA.ts'

export default class FastaMSA extends BaseMSA {
  private MSA: {
    seqdata: Record<string, string>
    colonNormalized: Record<string, string>
  }

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
      const defLine = entry.slice(0, newlineIdx)
      const spaceIdx = defLine.indexOf(' ')
      const id = spaceIdx === -1 ? defLine : defLine.slice(0, spaceIdx)
      if (id) {
        seqdata[id] = entry.slice(newlineIdx + 1).replaceAll(/\s/g, '')
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
    return Object.keys(this.MSA.seqdata)
  }

  getRow(name: string) {
    return (
      this.MSA.seqdata[name] ??
      this.MSA.seqdata[this.MSA.colonNormalized[name] ?? ''] ??
      ''
    )
  }

  getWidth() {
    const name = Object.keys(this.MSA.seqdata)[0]!
    return this.getRow(name).length
  }
}
