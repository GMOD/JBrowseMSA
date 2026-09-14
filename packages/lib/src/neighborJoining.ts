// Neighbor Joining tree construction using BLOSUM62 distances
// Based on Saitou & Nei (1987) "The neighbor-joining method"

// prettier-ignore
const BLOSUM62_KEYS = 'ARNDCQEGHILKMFPSTWYVBZX*'
// prettier-ignore
const BLOSUM62_DATA = [
  [ 4,-1,-2,-2, 0,-1,-1, 0,-2,-1,-1,-1,-1,-2,-1, 1, 0,-3,-2, 0,-2,-1, 0,-4],
  [-1, 5, 0,-2,-3, 1, 0,-2, 0,-3,-2, 2,-1,-3,-2,-1,-1,-3,-2,-3,-1, 0,-1,-4],
  [-2, 0, 6, 1,-3, 0, 0, 0, 1,-3,-3, 0,-2,-3,-2, 1, 0,-4,-2,-3, 3, 0,-1,-4],
  [-2,-2, 1, 6,-3, 0, 2,-1,-1,-3,-4,-1,-3,-3,-1, 0,-1,-4,-3,-3, 4, 1,-1,-4],
  [ 0,-3,-3,-3, 9,-3,-4,-3,-3,-1,-1,-3,-1,-2,-3,-1,-1,-2,-2,-1,-3,-3,-2,-4],
  [-1, 1, 0, 0,-3, 5, 2,-2, 0,-3,-2, 1, 0,-3,-1, 0,-1,-2,-1,-2, 0, 3,-1,-4],
  [-1, 0, 0, 2,-4, 2, 5,-2, 0,-3,-3, 1,-2,-3,-1, 0,-1,-3,-2,-2, 1, 4,-1,-4],
  [ 0,-2, 0,-1,-3,-2,-2, 6,-2,-4,-4,-2,-3,-3,-2, 0,-2,-2,-3,-3,-1,-2,-1,-4],
  [-2, 0, 1,-1,-3, 0, 0,-2, 8,-3,-3,-1,-2,-1,-2,-1,-2,-2, 2,-3, 0, 0,-1,-4],
  [-1,-3,-3,-3,-1,-3,-3,-4,-3, 4, 2,-3, 1, 0,-3,-2,-1,-3,-1, 3,-3,-3,-1,-4],
  [-1,-2,-3,-4,-1,-2,-3,-4,-3, 2, 4,-2, 2, 0,-3,-2,-1,-2,-1, 1,-4,-3,-1,-4],
  [-1, 2, 0,-1,-3, 1, 1,-2,-1,-3,-2, 5,-1,-3,-1, 0,-1,-3,-2,-2, 0, 1,-1,-4],
  [-1,-1,-2,-3,-1, 0,-2,-3,-2, 1, 2,-1, 5, 0,-2,-1,-1,-1,-1, 1,-3,-1,-1,-4],
  [-2,-3,-3,-3,-2,-3,-3,-3,-1, 0, 0,-3, 0, 6,-4,-2,-2, 1, 3,-1,-3,-3,-1,-4],
  [-1,-2,-2,-1,-3,-1,-1,-2,-2,-3,-3,-1,-2,-4, 7,-1,-1,-4,-3,-2,-2,-1,-2,-4],
  [ 1,-1, 1, 0,-1, 0, 0, 0,-1,-2,-2, 0,-1,-2,-1, 4, 1,-3,-2,-2, 0, 0, 0,-4],
  [ 0,-1, 0,-1,-1,-1,-1,-2,-2,-1,-1,-1,-1,-2,-1, 1, 5,-2,-2, 0,-1,-1, 0,-4],
  [-3,-3,-4,-4,-2,-2,-3,-2,-2,-3,-2,-3,-1, 1,-4,-3,-2,11, 2,-3,-4,-3,-2,-4],
  [-2,-2,-2,-3,-2,-1,-2,-3, 2,-1,-1,-2,-1, 3,-3,-2,-2, 2, 7,-1,-3,-2,-1,-4],
  [ 0,-3,-3,-3,-1,-2,-2,-3,-3, 3, 1,-2, 1,-1,-2,-2, 0,-3,-1, 4,-3,-2,-1,-4],
  [-2,-1, 3, 4,-3, 0, 1,-1, 0,-3,-4, 0,-3,-3,-2, 0,-1,-4,-3,-3, 4, 1,-1,-4],
  [-1, 0, 0, 1,-3, 3, 4,-2, 0,-3,-3, 1,-1,-3,-1, 0,-1,-3,-2,-2, 1, 4,-1,-4],
  [ 0,-1,-1,-1,-2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-2, 0, 0,-2,-1,-1,-1,-1,-1,-4],
  [-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4, 1],
]

const NUM_SYMBOLS = BLOSUM62_KEYS.length
const BLOSUM62 = Int8Array.from(BLOSUM62_DATA.flat())

// charCode -> row/column in BLOSUM62, -1 for anything the matrix does not name.
// On a 120x800 alignment a Map keyed by upper-cased character took 2.6s to
// build a tree, against 0.34s for this table.
const symbolOfCode = new Int8Array(128).fill(-1)
for (let i = 0; i < NUM_SYMBOLS; i++) {
  const key = BLOSUM62_KEYS[i]!
  symbolOfCode[key.charCodeAt(0)] = i
  symbolOfCode[key.toLowerCase().charCodeAt(0)] = i
}

// gap, or past the end of a row shorter than the alignment
const GAP = -2

// stockholm and a3m also write gaps as '.'
function symbolAt(seq: string, i: number) {
  if (i >= seq.length) {
    return GAP
  }
  const code = seq.charCodeAt(i)
  // bit trick: (code - 45) >>> 0 <= 1 checks for '-' (45) or '.' (46)
  if ((code - 45) >>> 0 <= 1) {
    return GAP
  }
  return code < 128 ? symbolOfCode[code]! : -1
}

function blosumScore(a: number, b: number) {
  return a < 0 || b < 0 ? -4 : BLOSUM62[a * NUM_SYMBOLS + b]!
}

function computePairwiseDistance(seq1: string, seq2: string) {
  // a3m and hand-edited fasta produce short rows; past its end a row counts as
  // gapped, as in the model's `blanks` getter
  const len = Math.max(seq1.length, seq2.length)
  let compared = 0
  let totalScore = 0
  let maxPossibleScore = 0

  for (let i = 0; i < len; i++) {
    const a = symbolAt(seq1, i)
    const b = symbolAt(seq2, i)

    const aGap = a === GAP
    const bGap = b === GAP
    if (aGap && bGap) {
      continue
    }

    compared++
    if (aGap || bGap) {
      continue
    }

    totalScore += blosumScore(a, b)
    maxPossibleScore += Math.max(blosumScore(a, a), blosumScore(b, b))
  }

  if (compared === 0) {
    return 1
  }

  if (maxPossibleScore <= 0) {
    return 1
  }

  const normalizedScore = totalScore / maxPossibleScore
  const clampedScore = Math.max(0.01, Math.min(1, normalizedScore))

  // Kimura-like correction: d = -ln(similarity)
  return -Math.log(clampedScore)
}

function computeDistanceMatrix(rows: readonly [string, string][]) {
  const n = rows.length
  const distances: number[][] = []

  for (let i = 0; i < n; i++) {
    distances[i] = []
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i]![j] = 0
      } else if (j < i) {
        distances[i]![j] = distances[j]![i]!
      } else {
        distances[i]![j] = computePairwiseDistance(rows[i]![1], rows[j]![1])
      }
    }
  }

  return distances
}

interface NJNode {
  name?: string
  left?: NJNode
  right?: NJNode
  leftLength?: number
  rightLength?: number
}

function neighborJoining(distances: number[][], names: string[]): NJNode {
  const n = distances.length
  if (n < 2) {
    return { name: names[0] }
  }
  if (n === 2) {
    const d = distances[0]![1]!
    return {
      left: { name: names[0] },
      right: { name: names[1] },
      leftLength: d / 2,
      rightLength: d / 2,
    }
  }

  const D: number[][] = []
  for (let i = 0; i < n; i++) {
    D[i] = [...distances[i]!]
  }
  const nodes: (NJNode | undefined)[] = names.map(name => ({ name }))

  let remaining = n

  while (remaining > 2) {
    const active: number[] = []
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i] !== undefined) {
        active.push(i)
      }
    }

    const r = new Map<number, number>()
    for (const i of active) {
      let sum = 0
      for (const j of active) {
        if (i !== j) {
          sum += D[i]![j]!
        }
      }
      r.set(i, sum)
    }

    let minQ = Infinity
    let minI = -1
    let minJ = -1

    for (let ai = 0; ai < active.length; ai++) {
      for (let aj = ai + 1; aj < active.length; aj++) {
        const i = active[ai]!
        const j = active[aj]!
        const q = (remaining - 2) * D[i]![j]! - r.get(i)! - r.get(j)!

        if (q < minQ) {
          minQ = q
          minI = i
          minJ = j
        }
      }
    }

    const dij = D[minI]![minJ]!
    const ri = r.get(minI)!
    const rj = r.get(minJ)!

    let limbI = dij / 2 + (ri - rj) / (2 * (remaining - 2))
    let limbJ = dij - limbI

    limbI = Math.max(0, limbI)
    limbJ = Math.max(0, limbJ)

    const newNode: NJNode = {
      left: nodes[minI],
      right: nodes[minJ],
      leftLength: limbI,
      rightLength: limbJ,
    }

    // the merged node reuses minI's slot
    for (const k of active) {
      if (k !== minI && k !== minJ) {
        const newDist = (D[minI]![k]! + D[minJ]![k]! - dij) / 2
        D[minI]![k] = Math.max(0, newDist)
        D[k]![minI] = Math.max(0, newDist)
      }
    }

    nodes[minJ] = undefined
    nodes[minI] = newNode

    remaining--
  }

  const finalActive: number[] = []
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] !== undefined) {
      finalActive.push(i)
    }
  }

  if (finalActive.length === 2) {
    const i = finalActive[0]!
    const j = finalActive[1]!
    const d = D[i]![j]!
    return {
      left: nodes[i],
      right: nodes[j],
      leftLength: d / 2,
      rightLength: d / 2,
    }
  }

  return nodes[finalActive[0]!]!
}

function withBranchLength(newick: string, branchLength?: number) {
  return branchLength === undefined
    ? newick
    : `${newick}:${branchLength.toFixed(6)}`
}

// iterative: an NJ tree of N leaves can be a caterpillar of depth ~N
function nodeToNewick(root: NJNode): string {
  const postOrder: NJNode[] = []
  const stack: NJNode[] = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    postOrder.push(node)
    if (node.left) {
      stack.push(node.left)
    }
    if (node.right) {
      stack.push(node.right)
    }
  }

  const newickByNode = new Map<NJNode, string>()
  for (let i = postOrder.length - 1; i >= 0; i--) {
    const node = postOrder[i]!
    if (node.name !== undefined && !node.left && !node.right) {
      newickByNode.set(node, `'${node.name.replaceAll("'", "''")}'`)
    } else {
      const left = node.left
        ? withBranchLength(newickByNode.get(node.left)!, node.leftLength)
        : ''
      const right = node.right
        ? withBranchLength(newickByNode.get(node.right)!, node.rightLength)
        : ''
      newickByNode.set(node, `(${left},${right})`)
    }
  }
  return newickByNode.get(root)!
}

export function calculateNeighborJoiningTree(
  rows: readonly [string, string][],
) {
  if (rows.length < 2) {
    throw new Error('Need at least 2 sequences to build a tree')
  }

  const names = rows.map(r => r[0])
  const distances = computeDistanceMatrix(rows)
  const tree = neighborJoining(distances, names)

  return nodeToNewick(tree) + ';'
}
