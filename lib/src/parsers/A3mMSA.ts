import type { NodeWithIds } from '../types'

// Char code helpers for fast character classification
const CODE_A = 65 // 'A'
const CODE_Z = 90 // 'Z'
const CODE_a = 97 // 'a'
const CODE_z = 122 // 'z'
const CODE_DASH = 45 // '-'
const CODE_DOT = 46 // '.'

function isUpperOrGap(code: number): boolean {
  return (
    (code >= CODE_A && code <= CODE_Z) ||
    code === CODE_DASH ||
    code === CODE_DOT
  )
}

function isLower(code: number): boolean {
  return code >= CODE_a && code <= CODE_z
}

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
  private orderedNames: string[]

  constructor(text: string) {
    const rawSeqs: string[] = []
    const names: string[] = []

    // First pass: parse sequences (like FASTA), preserving order
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
        rawSeqs.push(entry.slice(newlineIdx + 1).replaceAll(/\s/g, ''))
        names.push(id)
      }
    }

    this.orderedNames = names
    this.MSA = { seqdata: this.expandA3M(rawSeqs, names) }
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

    // Check for lowercase and compute lengths in single pass per sequence
    let hasLowercase = false
    let firstMatchLen = -1
    let firstRawLen = -1
    let sameMatchLength = true
    let differentRawLengths = false

    for (const seq of seqs) {
      let matchLen = 0
      for (let i = 0; i < seq.length; i++) {
        const code = seq.charCodeAt(i)
        if (isLower(code)) {
          hasLowercase = true
        } else {
          matchLen++
        }
      }

      if (firstMatchLen === -1) {
        firstMatchLen = matchLen
        firstRawLen = seq.length
      } else {
        if (matchLen !== firstMatchLen) {
          sameMatchLength = false
        }
        if (seq.length !== firstRawLen) {
          differentRawLengths = true
        }
      }
    }

    return hasLowercase && sameMatchLength && differentRawLengths
  }

  /**
   * Expand A3M format to standard aligned format.
   *
   * In A3M, lowercase characters are insertions that implicitly introduce
   * gaps in sequences that don't have an insert at that position.
   */
  private expandA3M(
    rawSeqs: string[],
    names: string[],
  ): Record<string, string> {
    const numSeqs = names.length
    if (numSeqs === 0) {
      return {}
    }

    // Parse sequences into parallel arrays: matchChars and insertLengths
    // matchChars[seqIdx] = string of match characters for that sequence
    // insertLengths[seqIdx] = array of insert lengths after each match position
    const matchChars: string[] = []
    const insertLengths: number[][] = []

    for (let seqIdx = 0; seqIdx < numSeqs; seqIdx++) {
      const seq = rawSeqs[seqIdx]!
      const matches: string[] = []
      const insLens: number[] = []
      let i = 0

      while (i < seq.length) {
        const code = seq.charCodeAt(i)

        if (isUpperOrGap(code)) {
          matches.push(seq[i]!)
          // Count following lowercase inserts
          let insLen = 0
          let j = i + 1
          while (j < seq.length && isLower(seq.charCodeAt(j))) {
            insLen++
            j++
          }
          insLens.push(insLen)
          i = j
        } else if (isLower(code)) {
          // Leading insert before first match
          matches.push('')
          let insLen = 0
          let j = i
          while (j < seq.length && isLower(seq.charCodeAt(j))) {
            insLen++
            j++
          }
          insLens.push(insLen)
          i = j
        } else {
          i++
        }
      }

      matchChars.push(matches.join(''))
      insertLengths.push(insLens)
    }

    // Find number of match positions and max inserts at each position
    let numPositions = 0
    for (let seqIdx = 0; seqIdx < numSeqs; seqIdx++) {
      const len = insertLengths[seqIdx]!.length
      if (len > numPositions) {
        numPositions = len
      }
    }

    const maxInserts = new Array<number>(numPositions).fill(0)
    for (let seqIdx = 0; seqIdx < numSeqs; seqIdx++) {
      const insLens = insertLengths[seqIdx]!
      for (let pos = 0; pos < insLens.length; pos++) {
        const len = insLens[pos]!
        if (len > maxInserts[pos]!) {
          maxInserts[pos] = len
        }
      }
    }

    // Pre-compute gap strings for common lengths (avoid repeated .repeat())
    const gapCache: string[] = ['']
    const maxGap = Math.max(...maxInserts, 0)
    for (let i = 1; i <= maxGap; i++) {
      gapCache.push('.'.repeat(i))
    }

    // Build expanded sequences
    const expanded: Record<string, string> = {}

    for (let seqIdx = 0; seqIdx < numSeqs; seqIdx++) {
      const seq = rawSeqs[seqIdx]!
      const matches = matchChars[seqIdx]!
      const insLens = insertLengths[seqIdx]!
      const result: string[] = []

      // Track position in original sequence for extracting inserts
      let seqPos = 0

      for (let pos = 0; pos < numPositions; pos++) {
        const maxIns = maxInserts[pos]!

        if (pos < insLens.length) {
          const matchChar = matches[pos]
          const insLen = insLens[pos]!

          // Add match character
          if (matchChar) {
            result.push(matchChar)
            seqPos++
          } else {
            result.push('.')
          }

          // Extract and uppercase inserts from original sequence
          if (insLen > 0) {
            result.push(seq.slice(seqPos, seqPos + insLen).toUpperCase())
            seqPos += insLen
          }

          // Pad with gaps
          const padding = maxIns - insLen
          if (padding > 0) {
            result.push(gapCache[padding]!)
          }
        } else {
          // This sequence is shorter - add gaps
          result.push(gapCache[1 + maxIns]!)
        }
      }

      expanded[names[seqIdx]!] = result.join('')
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
    return this.orderedNames
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
