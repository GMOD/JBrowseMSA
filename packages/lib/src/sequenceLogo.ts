import { letterOfResidueSlot } from './columnCounts.ts'

import type { ColumnCounts } from './columnCounts.ts'

export interface LogoLetter {
  letter: string
  /** height of this letter's slice of the stack, in bits */
  bits: number
}

/** the y-axis ceiling of a logo: the information content of a fully conserved
 * column, log2 of the alphabet size */
export function maxBitsFor(sequenceType: 'dna' | 'rna' | 'amino') {
  return Math.log2(sequenceType === 'amino' ? 20 : 4)
}

/**
 * One column of a sequence logo, tallest letter last so a caller can draw the
 * stack bottom-up in array order.
 *
 * Heights follow Schneider & Stephens: the column's information content is
 * `log2(alphabet) - H` bits, and each residue takes the share of that its own
 * frequency earns. Frequencies come from the non-gap residues only, so a column
 * of two residues and eight gaps is read as a two-way choice rather than a
 * ten-way one -- otherwise every gappy column would look uninformative for the
 * wrong reason.
 *
 * The whole stack is then scaled by the non-gap fraction, which plain WebLogo
 * does not do. Here it earns its place: the track sits directly under an
 * alignment where the gaps are visible, and a column that is 90% gap drawing a
 * full-height stack off its one remaining pair of residues reads as a conserved
 * site. Scaling makes stack height mean "how much this column tells you about
 * the family", matching what the conservation track above it already plots.
 */
export function columnLogoStack(
  colStats: ColumnCounts,
  col: number,
  maxBits: number,
): LogoLetter[] {
  const total = colStats.total(col)
  const gapCount = colStats.gapCount(col)
  const nonGapTotal = total - gapCount
  if (nonGapTotal === 0) {
    return []
  }

  let entropy = 0
  colStats.forEachResidue(col, (_slot, count) => {
    const freq = count / nonGapTotal
    entropy -= freq * Math.log2(freq)
  })

  const informationContent =
    Math.max(0, maxBits - entropy) * (total === 0 ? 0 : nonGapTotal / total)
  if (informationContent === 0) {
    return []
  }

  const stack: LogoLetter[] = []
  colStats.forEachResidue(col, (slot, count) => {
    stack.push({
      letter: letterOfResidueSlot(slot),
      bits: (count / nonGapTotal) * informationContent,
    })
  })
  // ascending, so drawing in order stacks the tallest letter on top. Ties break
  // on letter to keep the stack order stable between redraws.
  stack.sort((a, b) => a.bits - b.bits || a.letter.localeCompare(b.letter))
  return stack
}
