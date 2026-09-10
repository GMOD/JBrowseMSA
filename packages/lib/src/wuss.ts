// WUSS notation (Rfam's `#=GC SS_cons`) names a consensus secondary structure
// by pairing columns. Nested helices use bracket pairs -- <>, (), [], {} --
// each type kept on its own stack, and a pseudoknot, which by definition
// crosses a helix it cannot nest inside, uses a letter pair instead: `A` opens
// and `a` closes, `B`/`b` for a second one. Everything else (. , _ - : ~) is
// unpaired.

const closeToOpen: Record<string, string> = {
  '>': '<',
  ')': '(',
  ']': '[',
  '}': '{',
}
const opens = new Set(Object.values(closeToOpen))

export interface BasePair {
  /** 0-based column */
  start: number
  /** 0-based column */
  end: number
  /** the pair crosses a helix rather than nesting inside one */
  pseudoknot: boolean
}

/**
 * The base pairs a WUSS string encodes, as 0-based column indexes. Unmatched
 * brackets are dropped rather than throwing: a hand-edited or truncated
 * alignment should still draw the helices it does close.
 */
export function parseWuss(ss: string): BasePair[] {
  const stacks = new Map<string, number[]>()
  const pairs: BasePair[] = []
  const push = (key: string, col: number) => {
    const stack = stacks.get(key)
    if (stack) {
      stack.push(col)
    } else {
      stacks.set(key, [col])
    }
  }
  const pop = (key: string, col: number, pseudoknot: boolean) => {
    const start = stacks.get(key)?.pop()
    if (start !== undefined) {
      pairs.push({ start, end: col, pseudoknot })
    }
  }

  for (let col = 0; col < ss.length; col++) {
    const ch = ss[col]!
    const opener = closeToOpen[ch]
    if (opens.has(ch)) {
      push(ch, col)
    } else if (opener) {
      pop(opener, col, false)
    } else if (ch >= 'A' && ch <= 'Z') {
      push(ch, col)
    } else if (ch >= 'a' && ch <= 'z') {
      pop(ch.toUpperCase(), col, true)
    }
  }
  return pairs.sort((a, b) => a.start - b.start)
}
