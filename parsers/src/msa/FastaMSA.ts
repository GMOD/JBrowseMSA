import type { NodeWithIds } from '../types'

export default class FastaMSA {
  private MSA: { seqdata: Record<string, string> }

  constructor(text: string) {
    const seqdata: Record<string, string> = {}
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
      }
    }
    this.MSA = { seqdata }
  }

  getMSA() {
    return this.MSA
  }

  getRowData() {
    return undefined
  }

  getNames() {
    return Object.keys(this.MSA.seqdata)
  }

  getRow(name: string) {
    return this.MSA.seqdata[name] || ''
  }

  getWidth() {
    const name = Object.keys(this.MSA.seqdata)[0]!
    return this.getRow(name).length
  }

  getStructures() {
    return {}
  }

  get alignmentNames() {
    return []
  }

  getHeader() {
    return {}
  }

  getTree(): NodeWithIds {
    return {
      id: 'root',
      name: 'root',
      noTree: true,
      children: this.getNames().map(name => ({
        id: name,
        children: [],
        name,
      })),
    }
  }

  get seqConsensus() {
    return undefined
  }
  get secondaryStructureConsensus() {
    return undefined
  }

  get tracks() {
    return []
  }
}
