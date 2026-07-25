import { numResidueSlots, residueSlotOfLetter } from './columnCounts.ts'

import type { ColumnCounts } from './columnCounts.ts'

// Disjoint physicochemical classes for the 20 standard amino acids. Property
// conservation asks a different question than identity conservation: a column
// can vary in exact residue yet stay within one property class (a conservative
// substitution), which often marks a functionally constrained site that plain
// identity conservation reports as variable.
//
// Histidine is grouped with the aromatics (it is only weakly/conditionally
// positive at physiological pH); this mirrors common substitution-class schemes.
const aminoPropertyClass: Record<string, string> = {
  A: 'hydrophobic',
  V: 'hydrophobic',
  L: 'hydrophobic',
  I: 'hydrophobic',
  M: 'hydrophobic',
  C: 'hydrophobic',
  F: 'aromatic',
  W: 'aromatic',
  Y: 'aromatic',
  H: 'aromatic',
  K: 'positive',
  R: 'positive',
  D: 'negative',
  E: 'negative',
  S: 'polar',
  T: 'polar',
  N: 'polar',
  Q: 'polar',
  G: 'special',
  P: 'special',
}

const propertyClasses = [...new Set(Object.values(aminoPropertyClass))]
const maxPropertyEntropy = Math.log2(propertyClasses.length)

// residue slot -> index into propertyClasses (-1 for residues with no class,
// e.g. X or '*'), so the per-column tally needs no string lookups
const classOfSlot = new Int8Array(numResidueSlots).fill(-1)
for (const [letter, cls] of Object.entries(aminoPropertyClass)) {
  classOfSlot[residueSlotOfLetter(letter)] = propertyClasses.indexOf(cls)
}

/**
 * Per-column property conservation using Shannon entropy over physicochemical
 * classes rather than exact residues. Returns 0-1 where 1 = every non-gap
 * residue shares one property class. Mirrors the identity-conservation formula
 * so the two tracks are directly comparable: (1 - H/Hmax) * (1 - gapFraction).
 */
export function calculatePropertyConservation(counts: ColumnCounts) {
  const classCounts = new Float64Array(propertyClasses.length)
  return Array.from({ length: counts.numColumns }, (_, col) => {
    const total = counts.total(col)
    let score = 0
    if (total) {
      classCounts.fill(0)
      let nonGapTotal = 0
      counts.forEachResidue(col, (slot, count) => {
        const cls = classOfSlot[slot]!
        if (cls >= 0) {
          classCounts[cls]! += count
          nonGapTotal += count
        }
      })
      if (nonGapTotal > 0) {
        let entropy = 0
        for (const count of classCounts) {
          if (count > 0) {
            const freq = count / nonGapTotal
            entropy -= freq * Math.log2(freq)
          }
        }
        const gapFraction = (total - nonGapTotal) / total
        score =
          Math.max(0, 1 - entropy / maxPropertyEntropy) * (1 - gapFraction)
      }
    }
    return score
  })
}
