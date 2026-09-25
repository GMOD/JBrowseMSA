// The standard genetic code, and a codon-by-codon comparison of an alignment's
// rows against one reference row. CodonView.tsx turns the comparison into
// layers.

const bases = 'TCAG'
const aminoAcids =
  'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG'

export const geneticCode: Record<string, string> = Object.fromEntries(
  [...aminoAcids].map((aminoAcid, i) => [
    bases[i >> 4]! + bases[(i >> 2) & 3]! + bases[i & 3]!,
    aminoAcid,
  ]),
)

export type Change = 'synonymous' | 'non-synonymous' | 'stop' | 'gapped'

export interface Row {
  name: string
  sequence: string
}

export interface RowChange {
  row: string
  change: Change
  codon: string
  /** the row's own residue numbers the codon's columns cover, 1-based */
  start: number
  end: number
}

export interface CodonComparison {
  /** 1-based, counted along the reference */
  number: number
  /** the 0-based alignment columns of the reference codon's three bases */
  columns: number[]
  codon: string
  aminoAcid: string
  changes: RowChange[]
}

const isGap = (base: string | undefined) =>
  base === undefined || base === '-' || base === '.'

/** the amino acid a codon codes for, `*` for a stop, undefined for a gap or N */
export function translate(codon: string) {
  return geneticCode[codon.toUpperCase().replaceAll('U', 'T')]
}

/**
 * The columns of each codon of an aligned row: its bases in threes from the
 * first, skipping the row's gaps, so the three columns of a codon that a gap
 * interrupts are not adjacent. It drops a trailing partial codon.
 */
export function readingFrame(row: string) {
  const baseColumns: number[] = []
  for (let col = 0; col < row.length; col++) {
    if (!isGap(row[col])) {
      baseColumns.push(col)
    }
  }
  const codons: number[][] = []
  for (let i = 0; i + 3 <= baseColumns.length; i += 3) {
    codons.push(baseColumns.slice(i, i + 3))
  }
  return codons
}

/**
 * How `other` differs from `reference` at one codon. Undefined for an
 * identical codon, a codon deleted outright, or one holding a base other than
 * A, C, G, T or U. A codon missing one or two bases is `gapped`, which is how
 * a frameshift shows at the codon it starts in.
 */
export function classify(reference: string, other: string): Change | undefined {
  const gaps = [...other].filter(isGap).length
  if (gaps === 3) {
    return undefined
  }
  if (gaps > 0) {
    return 'gapped'
  }
  const from = translate(reference)
  const to = translate(other)
  if (!from || !to || reference.toUpperCase() === other.toUpperCase()) {
    return undefined
  }
  if (to === '*' && from !== '*') {
    return 'stop'
  }
  return from === to ? 'synonymous' : 'non-synonymous'
}

function residueNumbers(row: string) {
  let n = 0
  return [...row].map(base => (isGap(base) ? undefined : ++n))
}

/**
 * Every codon of the reference row, translated, with the rows whose bases at
 * the same columns make a different codon. Every row is read in the
 * reference's frame, so a row with a frameshift is compared base for base on
 * its homologous columns, and the codon holding the shift is `gapped`.
 */
export function compareCodons(
  rows: Row[],
  reference: string,
): CodonComparison[] {
  const ref = rows.find(row => row.name === reference)
  if (!ref) {
    return []
  }
  const others = rows
    .filter(row => row.name !== reference)
    .map(row => ({ ...row, numbers: residueNumbers(row.sequence) }))
  return readingFrame(ref.sequence).map((columns, i) => {
    const codon = columns.map(col => ref.sequence[col]).join('')
    return {
      number: i + 1,
      columns,
      codon,
      aminoAcid: translate(codon) ?? 'X',
      changes: others.flatMap(({ name, sequence, numbers }) => {
        const bases = columns.map(col => sequence[col] ?? '-').join('')
        const change = classify(codon, bases)
        const covered = columns
          .map(col => numbers[col])
          .filter(n => n !== undefined)
        return change
          ? [
              {
                row: name,
                change,
                codon: bases,
                start: Math.min(...covered),
                end: Math.max(...covered),
              },
            ]
          : []
      }),
    }
  })
}
