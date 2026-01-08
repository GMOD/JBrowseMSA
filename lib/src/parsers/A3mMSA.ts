import type { NodeWithIds } from '../types'

/**
 * A3M format parser
 *
 * The A3M format consists of aligned fasta, in which:
 * - Insertions are shown as lowercase characters
 * - Matches are shown as uppercase characters
 * - Deletions are shown as '-'
 * - Gaps aligned to inserts are shown as '.'
 *
 * The key property is that lowercase letters (inserts) implicitly introduce
 * gaps in all other sequences that don't have an insert at that position.
 */
export default class A3mMSA {
  private MSA: { seqdata: Record<string, string> }

  constructor(text: string) {
    const rawSeqs: Record<string, string> = {}

    // First pass: parse sequences (like FASTA)
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
        rawSeqs[id] = entry.slice(newlineIdx + 1).replaceAll(/\s/g, '')
      }
    }

    // Expand the A3M alignment
    this.MSA = { seqdata: this.expandA3M(rawSeqs) }
  }

  /**
   * Detect if text is likely A3M format
   */
  static sniff(text: string): boolean {
    if (!text.startsWith('>')) {
      return false
    }

    const seqs: string[] = []
    for (const entry of text.split('>')) {
      if (!/\S/.test(entry)) {
        continue
      }
      const newlineIdx = entry.indexOf('\n')
      if (newlineIdx === -1) {
        continue
      }
      const seq = entry.slice(newlineIdx + 1).replaceAll(/\s/g, '')
      if (seq) {
        seqs.push(seq)
      }
    }

    if (seqs.length < 2) {
      return false
    }

    // Check for lowercase letters (inserts) in the sequences
    const hasLowercase = seqs.some(seq => /[a-z]/.test(seq))
    if (!hasLowercase) {
      return false
    }

    // Check if sequences have different lengths (after removing lowercase,
    // they should be the same length in A3M)
    const matchLengths = seqs.map(seq => seq.replaceAll(/[a-z]/g, '').length)
    const firstLen = matchLengths[0]
    const sameMatchLength = matchLengths.every(len => len === firstLen)

    // In A3M, the "match length" (uppercase + gaps) should be consistent
    // but the raw lengths differ due to lowercase inserts
    const rawLengths = seqs.map(seq => seq.length)
    const differentRawLengths = !rawLengths.every(len => len === rawLengths[0])

    return sameMatchLength && differentRawLengths
  }

  /**
   * Expand A3M format to standard aligned format.
   *
   * In A3M, lowercase characters are insertions that implicitly introduce
   * gaps in sequences that don't have an insert at that position.
   *
   * Algorithm:
   * 1. Parse each sequence into "match positions" - each match position
   *    consists of a match character (uppercase, -, .) followed by zero
   *    or more insert characters (lowercase)
   * 2. For each match position, find the maximum number of inserts
   *    across all sequences
   * 3. Expand each sequence by padding insert runs with '.' to match
   *    the maximum
   */
  private expandA3M(rawSeqs: Record<string, string>): Record<string, string> {
    const names = Object.keys(rawSeqs)
    if (names.length === 0) {
      return rawSeqs
    }

    // Parse each sequence into match positions with trailing inserts
    const parsed = new Map<string, { match: string; inserts: string }[]>()

    for (const name of names) {
      const seq = rawSeqs[name]!
      const positions: { match: string; inserts: string }[] = []
      let i = 0

      while (i < seq.length) {
        const char = seq[i]!

        // Check if this is a match character (uppercase, -, .)
        if (/[A-Z\-.]/.test(char)) {
          // Collect any following lowercase inserts
          let inserts = ''
          let j = i + 1
          while (j < seq.length && /[a-z]/.test(seq[j]!)) {
            inserts += seq[j]
            j++
          }
          positions.push({ match: char, inserts })
          i = j
        } else if (/[a-z]/.test(char)) {
          // Leading insert before first match - add a placeholder
          let inserts = ''
          let j = i
          while (j < seq.length && /[a-z]/.test(seq[j]!)) {
            inserts += seq[j]
            j++
          }
          positions.push({ match: '', inserts })
          i = j
        } else {
          // Skip unknown characters
          i++
        }
      }

      parsed.set(name, positions)
    }

    // Find the number of match positions
    const numPositions = Math.max(...[...parsed.values()].map(p => p.length))

    // Find the maximum number of inserts at each position
    const maxInserts: number[] = []
    for (let pos = 0; pos < numPositions; pos++) {
      let max = 0
      for (const positions of parsed.values()) {
        const p = positions[pos]
        if (p) {
          max = Math.max(max, p.inserts.length)
        }
      }
      maxInserts.push(max)
    }

    // Expand each sequence
    const expanded: Record<string, string> = {}

    for (const name of names) {
      const positions = parsed.get(name)!
      let result = ''

      for (let pos = 0; pos < numPositions; pos++) {
        const p = positions[pos]
        const maxIns = maxInserts[pos]!

        if (p) {
          // Add the match character (or gap if empty)
          result += p.match || '.'

          // Add inserts, uppercased, padded with gaps
          const inserts = p.inserts.toUpperCase()
          result += inserts
          result += '.'.repeat(maxIns - inserts.length)
        } else {
          // This sequence is shorter - add gaps
          result += '.'
          result += '.'.repeat(maxIns)
        }
      }

      expanded[name] = result
    }

    return expanded
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
    const name = Object.keys(this.MSA.seqdata)[0]
    return name ? this.getRow(name).length : 0
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
