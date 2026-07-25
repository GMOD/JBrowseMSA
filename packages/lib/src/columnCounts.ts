// Per-column residue counts for an alignment, stored as a flat typed array
// instead of one `Record<string, number>` per column. Column statistics are the
// hottest computation in the viewer (they feed conservation, ClustalX coloring,
// consensus and the hover tooltip), and the object-per-column form spent all of
// its time on megamorphic string-keyed property increments: 1000x5000 residues
// took ~1.6s to tally that way versus ~35ms here.
//
// Each column owns a fixed stride of counter slots. Slots 1-26 are A-Z (case
// folded), plus a slot each for the two gap characters, '*', and anything else.

const SLOTS = 32
const DASH = 27
const DOT = 28
const STAR = 29
const OTHER = 30

const A = 'A'.charCodeAt(0)
const Z = 'Z'.charCodeAt(0)
const a = 'a'.charCodeAt(0)
const z = 'z'.charCodeAt(0)

// charCode -> slot. A plain `code & 31` would fold digits and punctuation onto
// letter slots ('0' onto 'P'), so the mapping is an explicit table.
const slotOfCode = new Uint8Array(128).fill(OTHER)
for (let c = A; c <= Z; c++) {
  slotOfCode[c] = c - A + 1
}
for (let c = a; c <= z; c++) {
  slotOfCode[c] = c - a + 1
}
slotOfCode['-'.charCodeAt(0)] = DASH
slotOfCode['.'.charCodeAt(0)] = DOT
slotOfCode['*'.charCodeAt(0)] = STAR

const letterOfSlot = Array.from({ length: SLOTS }, (_, slot) =>
  slot >= 1 && slot <= 26 ? String.fromCharCode(A + slot - 1) : '',
)
letterOfSlot[DASH] = '-'
letterOfSlot[DOT] = '.'
letterOfSlot[STAR] = '*'
letterOfSlot[OTHER] = '?'

function slotOf(code: number) {
  return code < 128 ? slotOfCode[code]! : OTHER
}

export function isGapSlot(slot: number) {
  return slot === DASH || slot === DOT
}

export class ColumnCounts {
  readonly numColumns: number
  private readonly counts: Uint32Array
  // per-column residue+gap totals
  readonly totals: Uint32Array
  // whole-alignment totals per slot, so "which letters appear anywhere" is a
  // 32-slot scan rather than a walk over every column
  private readonly slotTotals = new Uint32Array(SLOTS)

  constructor(numColumns: number) {
    this.numColumns = numColumns
    this.counts = new Uint32Array(numColumns * SLOTS)
    this.totals = new Uint32Array(numColumns)
  }

  addRow(row: string) {
    const { counts, totals, slotTotals } = this
    const n = Math.min(row.length, this.numColumns)
    for (let col = 0; col < n; col++) {
      const slot = slotOf(row.charCodeAt(col))
      counts[col * SLOTS + slot]!++
      totals[col]!++
      slotTotals[slot]!++
    }
  }

  add(col: number, letter: string) {
    const slot = slotOf(letter.charCodeAt(0))
    this.counts[col * SLOTS + slot]!++
    this.totals[col]!++
    this.slotTotals[slot]!++
  }

  total(col: number) {
    return this.totals[col] ?? 0
  }

  count(col: number, letter: string) {
    return this.counts[col * SLOTS + slotOf(letter.charCodeAt(0))] ?? 0
  }

  gapCount(col: number) {
    const base = col * SLOTS
    return (this.counts[base + DASH] ?? 0) + (this.counts[base + DOT] ?? 0)
  }

  /**
   * Visits every non-gap residue present in a column. Slots with a zero count
   * are skipped, so this is ~the number of distinct residues, not 32.
   */
  forEachResidue(col: number, cb: (slot: number, count: number) => void) {
    const { counts } = this
    const base = col * SLOTS
    for (let slot = 1; slot < SLOTS; slot++) {
      const count = counts[base + slot]!
      if (count > 0 && !isGapSlot(slot)) {
        cb(slot, count)
      }
    }
  }

  /** non-gap [letter, count] pairs for one column, for display */
  residueEntries(col: number) {
    const entries: [string, number][] = []
    this.forEachResidue(col, (slot, count) => {
      entries.push([letterOfSlot[slot]!, count])
    })
    return entries
  }

  /** the distinct non-gap letters appearing anywhere in the alignment */
  get lettersPresent() {
    const letters = new Set<string>()
    for (let slot = 1; slot < SLOTS; slot++) {
      if (this.slotTotals[slot]! > 0 && !isGapSlot(slot)) {
        letters.add(letterOfSlot[slot]!)
      }
    }
    return letters
  }
}

export function letterOfResidueSlot(slot: number) {
  return letterOfSlot[slot]!
}

export function residueSlotOfLetter(letter: string) {
  return slotOf(letter.charCodeAt(0))
}

export const numResidueSlots = SLOTS

/**
 * Tally counts from alignment rows (gapped sequence strings, one per row). The
 * column count follows the longest row, matching what a per-column tally of
 * ragged input produces.
 */
export function columnCountsFromRows(rows: string[]) {
  const numColumns = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const counts = new ColumnCounts(numColumns)
  for (const row of rows) {
    counts.addRow(row)
  }
  return counts
}

/**
 * Tally counts from column strings (one string per column, listing that
 * column's residues top to bottom). Convenient for tests and for callers that
 * already think column-wise.
 */
export function columnCountsFromColumns(columns: string[]) {
  const counts = new ColumnCounts(columns.length)
  for (const [col, column] of columns.entries()) {
    for (const letter of column) {
      counts.add(col, letter)
    }
  }
  return counts
}
