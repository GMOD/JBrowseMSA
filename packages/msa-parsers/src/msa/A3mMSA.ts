import BaseMSA from './BaseMSA.ts'
import { splitFastaRecords } from './fastaRecords.ts'

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

function isLower(code: number): boolean {
  return code >= CODE_a && code <= CODE_z
}

function isMatch(code: number): boolean {
  return (code >= CODE_A && code <= CODE_Z) || code === CODE_DASH
}

interface ParsedRow {
  // one entry per match column, in order
  matches: string[]
  // inserts[k] is the run of insert residues sitting immediately BEFORE match
  // column k, already uppercased; inserts[matches.length] holds the trailing
  // run. An insert must never consume a match column, or a row that opens with
  // an insert falls a column out of register with every other row.
  inserts: string[]
}

function parseRow(seq: string): ParsedRow {
  const matches: string[] = []
  const inserts = ['']

  for (const ch of seq) {
    const code = ch.charCodeAt(0)
    if (isMatch(code)) {
      matches.push(ch)
      inserts.push('')
    } else if (isLower(code)) {
      inserts[inserts.length - 1] += ch.toUpperCase()
    }
    // '.' is padding aligned to some other row's insert, and anything else is
    // unrecognized -- neither carries alignment information
  }

  return { matches, inserts }
}

export default class A3mMSA extends BaseMSA {
  private MSA: { seqdata: Record<string, string> }
  private orderedNames: string[]

  constructor(text: string) {
    super()
    const records = splitFastaRecords(text)
    this.orderedNames = records.map(r => r.id)
    this.MSA = {
      seqdata: expandA3M(
        records.map(r => r.seq),
        this.orderedNames,
      ),
    }
  }

  static sniff(text: string): boolean {
    if (!text.startsWith('>')) {
      return false
    }

    const seqs = splitFastaRecords(text)
      .map(r => r.seq)
      .filter(s => !!s)

    if (seqs.length < 2) {
      return false
    }

    // A true aligned FASTA (e.g. impg's fasta-aln output from soft-masked
    // references) has all rows the same total length. A3M's defining feature is
    // variable-length rows, since lowercase inserts live outside the fixed match
    // grid. So equal-length rows are an alignment, not A3M, even when lowercase
    // soft-masking is present.
    if (new Set(seqs.map(s => s.length)).size === 1) {
      return false
    }

    const rows = seqs.map(parseRow)
    const hasLowercase = rows.some(r => r.inserts.some(i => !!i))
    const sameMatchLength = new Set(rows.map(r => r.matches.length)).size === 1

    return hasLowercase && sameMatchLength
  }

  getMSA() {
    return this.MSA
  }

  getNames() {
    return this.orderedNames
  }

  getRow(name: string) {
    return this.MSA.seqdata[name] ?? ''
  }
}

/**
 * Expand A3M rows into a rectangular alignment: every insert slot is widened to
 * the longest insert any row places there, and rows without one are padded with
 * '.' so all rows stay in register.
 */
function expandA3M(rawSeqs: string[], names: string[]): Record<string, string> {
  const rows = rawSeqs.map(parseRow)
  // a loop, not Math.max(...): an a3m from an hhblits search routinely carries
  // six figures of hits, and spreading one argument per row throws
  // "Maximum call stack size exceeded" somewhere past ~125k of them
  let numPositions = 0
  for (const { matches } of rows) {
    numPositions = Math.max(numPositions, matches.length)
  }

  // one insert slot before each match column, plus one trailing slot
  const maxInserts = new Array<number>(numPositions + 1).fill(0)
  for (const { inserts } of rows) {
    for (const [pos, ins] of inserts.entries()) {
      maxInserts[pos] = Math.max(maxInserts[pos]!, ins.length)
    }
  }

  const expanded: Record<string, string> = {}

  for (const [seqIdx, { matches, inserts }] of rows.entries()) {
    const result: string[] = []
    for (let pos = 0; pos <= numPositions; pos++) {
      const ins = inserts[pos] ?? ''
      result.push(ins, '.'.repeat(maxInserts[pos]! - ins.length))
      if (pos < numPositions) {
        // a row with fewer match columns than the widest is padded out
        result.push(matches[pos] ?? '-')
      }
    }
    expanded[names[seqIdx]!] = result.join('')
  }

  return expanded
}
