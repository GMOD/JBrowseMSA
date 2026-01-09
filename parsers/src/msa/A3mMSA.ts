import type { NodeWithIds } from '../types'

/**
 * A3M Format Parser
 *
 * The A3M format consists of aligned FASTA, in which alignments are shown with:
 * - Inserts as lowercase characters
 * - Matches as uppercase characters
 * - Deletions as '-'
 * - Gaps aligned to inserts as '.'
 *
 * Note that gaps aligned to inserts can be omitted in the A3M format.
 *
 * Example:
 * >query
 * ETESMKTVRIREKIKKFLGDRPRNTAEILEHINSTMRHGTTSQQLGNVLSKDKDIVKVGYIKRSGILSGGYDICEWATRNWVAEHCPEWTE
 * >seq1
 * ----MRTTRLRQKIKKFLNERGeANTTEILEHVNSTMRHGTTPQQLGNVLSKDKDILKVATTKRGGALSGRYEICVWTLRP-----------
 *
 * In the above, 'e' after 'G' in seq1 is a lowercase insert.
 *
 * @see https://yanglab.qd.sdu.edu.cn/trRosetta/msa_format.html
 */

// Char code helpers for fast character classification
const CODE_A = 65 // 'A'
const CODE_Z = 90 // 'Z'
const CODE_a = 97 // 'a'
const CODE_z = 122 // 'z'
const CODE_DASH = 45 // '-'
const CODE_DOT = 46 // '.'

function isLower(code: number): boolean {
  return code >= CODE_a && code <= CODE_z
}

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
    // In A3M, only uppercase letters are match columns (not gaps)
    let hasLowercase = false
    let firstUppercaseLen = -1
    let sameUppercaseLength = true

    for (const seq of seqs) {
      let uppercaseLen = 0
      for (let i = 0; i < seq.length; i++) {
        const code = seq.charCodeAt(i)
        if (isLower(code)) {
          hasLowercase = true
        } else if (code >= CODE_A && code <= CODE_Z) {
          uppercaseLen++
        }
      }

      if (firstUppercaseLen === -1) {
        firstUppercaseLen = uppercaseLen
      } else {
        if (uppercaseLen !== firstUppercaseLen) {
          sameUppercaseLength = false
        }
      }
    }

    return hasLowercase && sameUppercaseLength
  }

  /**
   * Expand A3M format to standard aligned format.
   *
   * In A3M, lowercase characters are insertions that implicitly introduce
   * gaps in sequences that don't have an insert at that position.
   * Gaps (-) following match columns in sequences without inserts align
   * with lowercase inserts in other sequences.
   */
  private expandA3M(
    rawSeqs: string[],
    names: string[],
  ): Record<string, string> {
    const numSeqs = names.length
    if (numSeqs === 0) {
      return {}
    }

    // Parse sequences: extract match chars (uppercase only) and insert content
    // For each sequence, track: matchChars, insertContent (after each match)
    const matchChars: string[][] = []
    const insertContent: string[][] = []

    for (let seqIdx = 0; seqIdx < numSeqs; seqIdx++) {
      const seq = rawSeqs[seqIdx]!
      const matches: string[] = []
      const inserts: string[] = []
      let i = 0

      while (i < seq.length) {
        const code = seq.charCodeAt(i)

        if (code >= CODE_A && code <= CODE_Z) {
          // Uppercase letter - match column
          matches.push(seq[i]!)
          // Collect following lowercase/gap characters as insert content
          let ins = ''
          let j = i + 1
          while (j < seq.length) {
            const c = seq.charCodeAt(j)
            if (isLower(c) || c === CODE_DASH || c === CODE_DOT) {
              ins += seq[j]!
              j++
            } else {
              break
            }
          }
          inserts.push(ins)
          i = j
        } else if (code === CODE_DASH || code === CODE_DOT) {
          // Leading gap before first match - skip
          i++
        } else if (isLower(code)) {
          // Leading insert before first match
          let ins = ''
          while (i < seq.length && isLower(seq.charCodeAt(i))) {
            ins += seq[i]!
            i++
          }
          // Add empty match with this insert
          matches.push('')
          inserts.push(ins)
        } else {
          i++
        }
      }

      matchChars.push(matches)
      insertContent.push(inserts)
    }

    // Find number of match positions (should be same for all valid A3M)
    const numPositions = Math.max(...matchChars.map(m => m.length), 0)

    // Find max insert length at each position (only count lowercase, not gaps)
    const maxInserts = new Array<number>(numPositions).fill(0)
    for (let seqIdx = 0; seqIdx < numSeqs; seqIdx++) {
      const inserts = insertContent[seqIdx]!
      for (let pos = 0; pos < inserts.length; pos++) {
        // Count only lowercase characters as actual inserts
        let lcCount = 0
        for (const c of inserts[pos]!) {
          if (isLower(c.charCodeAt(0))) {
            lcCount++
          }
        }
        if (lcCount > maxInserts[pos]!) {
          maxInserts[pos] = lcCount
        }
      }
    }

    // Build expanded sequences
    const expanded: Record<string, string> = {}

    for (let seqIdx = 0; seqIdx < numSeqs; seqIdx++) {
      const matches = matchChars[seqIdx]!
      const inserts = insertContent[seqIdx]!
      const result: string[] = []

      for (let pos = 0; pos < numPositions; pos++) {
        const maxIns = maxInserts[pos]!

        if (pos < matches.length) {
          const matchChar = matches[pos]!
          const insContent = inserts[pos] || ''

          // Add match character (or gap if empty)
          result.push(matchChar || '-')

          // Process insert content
          let lcContent = ''
          for (const c of insContent) {
            if (isLower(c.charCodeAt(0))) {
              lcContent += c.toUpperCase()
            }
          }

          // Add the insert content (uppercased)
          result.push(lcContent)

          // Pad with gaps to match max insert length
          const padding = maxIns - lcContent.length
          if (padding > 0) {
            result.push('.'.repeat(padding))
          }
        } else {
          // This sequence is shorter - add gaps
          result.push('-')
          if (maxIns > 0) {
            result.push('.'.repeat(maxIns))
          }
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
