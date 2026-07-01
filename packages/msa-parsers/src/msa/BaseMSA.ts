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
    return undefined as
      { name?: string; accession?: string; dbxref?: string } | undefined
  }

  getStructures(): Record<string, unknown> {
    return {}
  }

  getHeader(): Record<string, unknown> {
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

  get tracks(): {
    id: string
    name: string
    data?: string
    customColorScheme?: Record<string, string>
  }[] {
    return []
  }
}
