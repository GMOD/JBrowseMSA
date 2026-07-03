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

const numPropertyClasses = new Set(Object.values(aminoPropertyClass)).size
const maxPropertyEntropy = Math.log2(numPropertyClasses)

/**
 * Per-column property conservation using Shannon entropy over physicochemical
 * classes rather than exact residues. Returns 0-1 where 1 = every non-gap
 * residue shares one property class. Mirrors the identity-conservation formula
 * so the two tracks are directly comparable: (1 - H/Hmax) * (1 - gapFraction).
 */
export function calculatePropertyConservation(
  colStats: Record<string, number>[],
  colStatsSums: number[],
) {
  return colStats.map((stats, i) => {
    const total = colStatsSums[i]
    if (!total) {
      return 0
    }

    let nonGapTotal = 0
    const classCounts: Record<string, number> = {}
    for (const [letter, count] of Object.entries(stats)) {
      const cls = aminoPropertyClass[letter]
      if (cls) {
        classCounts[cls] = (classCounts[cls] ?? 0) + count
        nonGapTotal += count
      }
    }
    if (nonGapTotal === 0) {
      return 0
    }

    let entropy = 0
    for (const count of Object.values(classCounts)) {
      const freq = count / nonGapTotal
      entropy -= freq * Math.log2(freq)
    }

    const gapFraction = (total - nonGapTotal) / total
    return Math.max(0, 1 - entropy / maxPropertyEntropy) * (1 - gapFraction)
  })
}
