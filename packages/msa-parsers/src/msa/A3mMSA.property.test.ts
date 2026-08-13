import { describe, expect, test } from 'vitest'

import A3mMSA from './A3mMSA.ts'

/**
 * Generative check on the one invariant that defines A3M expansion: match
 * column k of every row must land at the same output column.
 *
 * Worth stating why the obvious invariants are not enough. The leading-insert
 * bug this file was written for expanded query "ABC" / seq2 "aABC" to "A.BC-" /
 * "-AABC" -- equal length, and each still ungaps back to its own input. Both of
 * the cheap checks pass on output where every seq2 residue is a column away
 * from its true partner. Only column correspondence catches it.
 *
 * Match residues and insert residues are drawn from disjoint alphabets so an
 * insert stays identifiable once expansion has uppercased it: any W/X/Y/Z in an
 * expanded row came from an insert, anything else is a match column or padding.
 */

const MATCH_ALPHABET = 'ACDEFGHIKL'
const INSERT_ALPHABET = 'wxyz'
const INSERT_UPPER = new Set(INSERT_ALPHABET.toUpperCase())

// small LCG so a failure reproduces from the seed printed in the test name
function makeRng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

interface GeneratedRow {
  raw: string
  // the match characters this row contributes, in order, one per match column
  matches: string[]
}

function generateRow(rng: () => number, numMatchCols: number): GeneratedRow {
  const matches: string[] = []
  let raw = ''

  for (let col = 0; col <= numMatchCols; col++) {
    // an insert run BEFORE this match column (col === numMatchCols is the
    // trailing slot); col 0 is the leading case the bug lived in
    if (rng() < 0.3) {
      const len = 1 + Math.floor(rng() * 3)
      for (let i = 0; i < len; i++) {
        raw += INSERT_ALPHABET[Math.floor(rng() * INSERT_ALPHABET.length)]!
      }
    }
    if (col < numMatchCols) {
      // '-' is a deletion, which still occupies a match column
      const ch =
        rng() < 0.2
          ? '-'
          : MATCH_ALPHABET[Math.floor(rng() * MATCH_ALPHABET.length)]!
      matches.push(ch)
      raw += ch
    }
  }

  return { raw, matches }
}

// Output indices of the match grid. A match column holds a residue or '-';
// insert slots hold uppercased insert residues or the '.' padding that widens
// them, so both of those are excluded.
function matchColumnIndices(expanded: string): number[] {
  const indices: number[] = []
  for (let i = 0; i < expanded.length; i++) {
    const ch = expanded[i]!
    if (!INSERT_UPPER.has(ch) && ch !== '.') {
      indices.push(i)
    }
  }
  return indices
}

describe('A3mMSA expansion invariants', () => {
  // A desync needs some rows to carry a leading insert and others not to, so no
  // single seed is guaranteed to produce one -- on the pre-fix parser this set
  // fails 8 of 12. Keep enough seeds that the class cannot slip through.
  for (const seed of [
    1, 7, 42, 99, 256, 1337, 4096, 8675, 31337, 65536, 90210, 123456,
  ]) {
    test(`match columns stay in register (seed ${seed})`, () => {
      const rng = makeRng(seed)
      const numMatchCols = 3 + Math.floor(rng() * 12)
      const numRows = 2 + Math.floor(rng() * 5)

      const rows = Array.from({ length: numRows }, () =>
        generateRow(rng, numMatchCols),
      )
      const names = rows.map((_, i) => `seq${i}`)
      const a3m = rows.map((r, i) => `>${names[i]}\n${r.raw}`).join('\n')

      const msa = new A3mMSA(a3m)
      const expanded = names.map(n => msa.getRow(n))

      // every row expands to the same width
      expect(new Set(expanded.map(e => e.length)).size).toBe(1)

      // the match grid sits at identical output columns in every row
      const grids = expanded.map(e => matchColumnIndices(e))
      for (const grid of grids) {
        expect(grid).toEqual(grids[0])
      }

      // and each row's match characters survive, in order, at those columns
      for (const [i, grid] of grids.entries()) {
        expect(grid).toHaveLength(numMatchCols)
        expect(grid.map(col => expanded[i]![col])).toEqual(rows[i]!.matches)
      }

      // inserts are never lost: each row keeps its own insert residues in order
      for (const [i, e] of expanded.entries()) {
        let keptInserts = ''
        for (let c = 0; c < e.length; c++) {
          if (INSERT_UPPER.has(e[c]!)) {
            keptInserts += e[c]
          }
        }
        const raw = rows[i]!.raw
        let sourceInserts = ''
        for (let c = 0; c < raw.length; c++) {
          if (INSERT_ALPHABET.includes(raw[c]!)) {
            sourceInserts += raw[c]!.toUpperCase()
          }
        }
        expect(keptInserts).toBe(sourceInserts)
      }
    })
  }
})
