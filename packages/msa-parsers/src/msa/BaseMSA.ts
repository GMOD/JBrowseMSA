import type { NodeWithIds } from '../types.ts'

export default abstract class BaseMSA {
  abstract getMSA(): unknown
  abstract getRow(name: string): string
  abstract getNames(): string[]

  private width?: number

  /**
   * Column count of the alignment: the length of its widest row.
   *
   * Not the first row's length. Ragged input is real -- a hand-edited fasta, or
   * an aligner that stops a row at its last residue -- and taking row 0 makes
   * every column past it unreachable when row 0 is the short one. The viewer's
   * gap analysis already defines the column count this way, so anything else
   * disagrees with it.
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

  get tracks(): {
    id: string
    name: string
    data?: string
    customColorScheme?: Record<string, string>
  }[] {
    return []
  }
}
