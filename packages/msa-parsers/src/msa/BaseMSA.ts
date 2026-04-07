import type { NodeWithIds } from '../types.ts'

export default abstract class BaseMSA {
  abstract getMSA(): unknown
  abstract getRow(name: string): string
  abstract getWidth(): number
  abstract getNames(): string[]

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

  getRowData(_name: string) {
    return undefined
  }

  getStructures(): Record<string, unknown> {
    return {}
  }

  getHeader(): unknown {
    return {}
  }

  get alignmentNames(): string[] {
    return []
  }

  get seqConsensus(): string | undefined {
    return undefined
  }

  get secondaryStructureConsensus(): string | undefined {
    return undefined
  }

  get tracks(): unknown[] {
    return []
  }
}
