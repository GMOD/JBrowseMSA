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

const BLOSUM62 = new Map<string, Map<string, number>>()
for (let i = 0; i < BLOSUM62_KEYS.length; i++) {
  const row = new Map<string, number>()
  for (let j = 0; j < BLOSUM62_KEYS.length; j++) {
    row.set(BLOSUM62_KEYS[j]!, BLOSUM62_DATA[i]![j]!)
  }
  BLOSUM62.set(BLOSUM62_KEYS[i]!, row)
}

function getBlosum62Score(a: string, b: string) {
  return BLOSUM62.get(a.toUpperCase())?.get(b.toUpperCase()) ?? -4
}

function computePairwiseDistance(seq1: string, seq2: string) {
  if (seq1.length !== seq2.length) {
    throw new Error('Sequences must have the same length (aligned)')
  }

  let matches = 0
  let mismatches = 0
  let totalScore = 0
  let maxPossibleScore = 0

  for (let i = 0; i < seq1.length; i++) {
    const a = seq1[i]!
    const b = seq2[i]!

    if (a === '-' && b === '-') {
      continue
    }

    if (a === '-' || b === '-') {
      mismatches++
      continue
    }

    const score = getBlosum62Score(a, b)
    totalScore += score
    maxPossibleScore += Math.max(getBlosum62Score(a, a), getBlosum62Score(b, b))

    if (a.toUpperCase() === b.toUpperCase()) {
      matches++
    } else {
      mismatches++
    }
  }

  const total = matches + mismatches
  if (total === 0) {
    return 1
  }

  // Convert similarity to distance using normalized BLOSUM62 score
  // Higher scores mean more similar, so we invert
  if (maxPossibleScore <= 0) {
    return 1
  }

  const normalizedScore = totalScore / maxPossibleScore
  // Clamp to valid range and convert to distance
  const clampedScore = Math.max(0.01, Math.min(1, normalizedScore))

  // Use Kimura-like correction: d = -ln(similarity)
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

  // Work with copies that we'll modify
  const D: number[][] = []
  for (let i = 0; i < n; i++) {
    D[i] = [...distances[i]!]
  }
  const nodes: (NJNode | undefined)[] = names.map(name => ({ name }))

  let remaining = n

  while (remaining > 2) {
    // Find active indices
    const active: number[] = []
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i] !== undefined) {
        active.push(i)
      }
    }

    // Compute r values (sum of distances for each node)
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

    // Find pair with minimum Q value
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

    // Calculate branch lengths
    const dij = D[minI]![minJ]!
    const ri = r.get(minI)!
    const rj = r.get(minJ)!

    let limbI: number
    let limbJ: number

    if (remaining > 2) {
      limbI = dij / 2 + (ri - rj) / (2 * (remaining - 2))
      limbJ = dij - limbI
    } else {
      limbI = dij / 2
      limbJ = dij / 2
    }

    // Ensure non-negative branch lengths
    limbI = Math.max(0, limbI)
    limbJ = Math.max(0, limbJ)

    // Create new node
    const newNode: NJNode = {
      left: nodes[minI],
      right: nodes[minJ],
      leftLength: limbI,
      rightLength: limbJ,
    }

    // Update distance matrix
    const newIdx = minI
    for (const k of active) {
      if (k !== minI && k !== minJ) {
        const newDist = (D[minI]![k]! + D[minJ]![k]! - dij) / 2
        D[newIdx]![k] = Math.max(0, newDist)
        D[k]![newIdx] = Math.max(0, newDist)
      }
    }

    // Mark minJ as removed
    nodes[minJ] = undefined
    nodes[newIdx] = newNode

    remaining--
  }

  // Connect final two nodes
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

function nodeToNewick(node: NJNode, branchLength?: number): string {
  let result: string

  if (node.name !== undefined && !node.left && !node.right) {
    const quotedName = node.name.replaceAll("'", "''")
    result = `'${quotedName}'`
  } else {
    const leftNewick = node.left ? nodeToNewick(node.left, node.leftLength) : ''
    const rightNewick = node.right
      ? nodeToNewick(node.right, node.rightLength)
      : ''
    result = `(${leftNewick},${rightNewick})`
  }

  if (branchLength !== undefined) {
    result += `:${branchLength.toFixed(6)}`
  }

  return result
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
