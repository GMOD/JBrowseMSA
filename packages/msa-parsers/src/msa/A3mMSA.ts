import BaseMSA from './BaseMSA.ts'

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

const CODE_A = 65 // 'A'
const CODE_Z = 90 // 'Z'
const CODE_a = 97 // 'a'
const CODE_z = 122 // 'z'
const CODE_DASH = 45 // '-'
const CODE_DOT = 46 // '.'

function isLower(code: number): boolean {
  return code >= CODE_a && code <= CODE_z
}

export default class A3mMSA extends BaseMSA {
  private MSA: { seqdata: Record<string, string> }
  private orderedNames: string[]

  constructor(text: string) {
    super()
    const rawSeqs: string[] = []
    const names: string[] = []

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

    let hasLowercase = false
    let firstMatchLen = -1
    let sameMatchLength = true

    for (const seq of seqs) {
      let matchLen = 0
      for (let i = 0; i < seq.length; i++) {
        const code = seq.charCodeAt(i)
        if (isLower(code)) {
          hasLowercase = true
        } else if ((code >= CODE_A && code <= CODE_Z) || code === CODE_DASH) {
          matchLen++
        }
      }

      if (firstMatchLen === -1) {
        firstMatchLen = matchLen
      } else {
        if (matchLen !== firstMatchLen) {
          sameMatchLength = false
        }
      }
    }

    return hasLowercase && sameMatchLength
  }

  private expandA3M(
    rawSeqs: string[],
    names: string[],
  ): Record<string, string> {
    const numSeqs = names.length
    if (numSeqs === 0) {
      return {}
    }

    const matchChars: string[][] = []
    const insertContent: string[][] = []

    for (let seqIdx = 0; seqIdx < numSeqs; seqIdx++) {
      const seq = rawSeqs[seqIdx]!
      const matches: string[] = []
      const inserts: string[] = []
      let i = 0

      while (i < seq.length) {
        const code = seq.charCodeAt(i)

        if ((code >= CODE_A && code <= CODE_Z) || code === CODE_DASH) {
          matches.push(seq[i]!)
          let ins = ''
          let j = i + 1
          while (j < seq.length) {
            const c = seq.charCodeAt(j)
            if (isLower(c) || c === CODE_DOT) {
              ins += seq[j]!
              j++
            } else {
              break
            }
          }
          inserts.push(ins)
          i = j
        } else if (code === CODE_DOT) {
          i++
        } else if (isLower(code)) {
          let ins = ''
          while (i < seq.length && isLower(seq.charCodeAt(i))) {
            ins += seq[i]!
            i++
          }
          matches.push('')
          inserts.push(ins)
        } else {
          i++
        }
      }

      matchChars.push(matches)
      insertContent.push(inserts)
    }

    const numPositions = Math.max(...matchChars.map(m => m.length), 0)

    const maxInserts = new Array<number>(numPositions).fill(0)
    for (let seqIdx = 0; seqIdx < numSeqs; seqIdx++) {
      const inserts = insertContent[seqIdx]!
      for (let pos = 0; pos < inserts.length; pos++) {
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

          result.push(matchChar || '-')

          let lcContent = ''
          for (const c of insContent) {
            if (isLower(c.charCodeAt(0))) {
              lcContent += c.toUpperCase()
            }
          }

          result.push(lcContent)

          const padding = maxIns - lcContent.length
          if (padding > 0) {
            result.push('.'.repeat(padding))
          }
        } else {
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
}
