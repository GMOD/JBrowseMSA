import type { MSATrack, NodeWithIds } from '../types.ts'

export default abstract class BaseMSA {
  abstract getMSA(): unknown
  abstract getRow(name: string): string
  abstract getNames(): string[]

  private width?: number

  /**
   * Column count of the alignment: the length of its widest row, since a
   * hand-edited fasta or some aligners leave rows short. The viewer's gap
   * analysis counts columns the same way.
   */
  getWidth(): number {
    this.width ??= this.getNames().reduce(
      (max, name) => Math.max(max, this.getRow(name).length),
      0,
    )
    return this.width
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

  getRowData(
    _name: string,
  ): { name?: string; accession?: string; dbxref?: string } | undefined {
    return undefined
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

  get tracks(): MSATrack[] {
    return []
  }
}
