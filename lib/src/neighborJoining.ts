// Neighbor Joining tree construction using BLOSUM62 distances
// Based on Saitou & Nei (1987) "The neighbor-joining method"

const BLOSUM62: Record<string, Record<string, number>> = {
  A: {
    A: 4, R: -1, N: -2, D: -2, C: 0, Q: -1, E: -1, G: 0, H: -2, I: -1,
    L: -1, K: -1, M: -1, F: -2, P: -1, S: 1, T: 0, W: -3, Y: -2, V: 0,
    B: -2, Z: -1, X: 0, '*': -4,
  },
  R: {
    A: -1, R: 5, N: 0, D: -2, C: -3, Q: 1, E: 0, G: -2, H: 0, I: -3,
    L: -2, K: 2, M: -1, F: -3, P: -2, S: -1, T: -1, W: -3, Y: -2, V: -3,
    B: -1, Z: 0, X: -1, '*': -4,
  },
  N: {
    A: -2, R: 0, N: 6, D: 1, C: -3, Q: 0, E: 0, G: 0, H: 1, I: -3,
    L: -3, K: 0, M: -2, F: -3, P: -2, S: 1, T: 0, W: -4, Y: -2, V: -3,
    B: 3, Z: 0, X: -1, '*': -4,
  },
  D: {
    A: -2, R: -2, N: 1, D: 6, C: -3, Q: 0, E: 2, G: -1, H: -1, I: -3,
    L: -4, K: -1, M: -3, F: -3, P: -1, S: 0, T: -1, W: -4, Y: -3, V: -3,
    B: 4, Z: 1, X: -1, '*': -4,
  },
  C: {
    A: 0, R: -3, N: -3, D: -3, C: 9, Q: -3, E: -4, G: -3, H: -3, I: -1,
    L: -1, K: -3, M: -1, F: -2, P: -3, S: -1, T: -1, W: -2, Y: -2, V: -1,
    B: -3, Z: -3, X: -2, '*': -4,
  },
  Q: {
    A: -1, R: 1, N: 0, D: 0, C: -3, Q: 5, E: 2, G: -2, H: 0, I: -3,
    L: -2, K: 1, M: 0, F: -3, P: -1, S: 0, T: -1, W: -2, Y: -1, V: -2,
    B: 0, Z: 3, X: -1, '*': -4,
  },
  E: {
    A: -1, R: 0, N: 0, D: 2, C: -4, Q: 2, E: 5, G: -2, H: 0, I: -3,
    L: -3, K: 1, M: -2, F: -3, P: -1, S: 0, T: -1, W: -3, Y: -2, V: -2,
    B: 1, Z: 4, X: -1, '*': -4,
  },
  G: {
    A: 0, R: -2, N: 0, D: -1, C: -3, Q: -2, E: -2, G: 6, H: -2, I: -4,
    L: -4, K: -2, M: -3, F: -3, P: -2, S: 0, T: -2, W: -2, Y: -3, V: -3,
    B: -1, Z: -2, X: -1, '*': -4,
  },
  H: {
    A: -2, R: 0, N: 1, D: -1, C: -3, Q: 0, E: 0, G: -2, H: 8, I: -3,
    L: -3, K: -1, M: -2, F: -1, P: -2, S: -1, T: -2, W: -2, Y: 2, V: -3,
    B: 0, Z: 0, X: -1, '*': -4,
  },
  I: {
    A: -1, R: -3, N: -3, D: -3, C: -1, Q: -3, E: -3, G: -4, H: -3, I: 4,
    L: 2, K: -3, M: 1, F: 0, P: -3, S: -2, T: -1, W: -3, Y: -1, V: 3,
    B: -3, Z: -3, X: -1, '*': -4,
  },
  L: {
    A: -1, R: -2, N: -3, D: -4, C: -1, Q: -2, E: -3, G: -4, H: -3, I: 2,
    L: 4, K: -2, M: 2, F: 0, P: -3, S: -2, T: -1, W: -2, Y: -1, V: 1,
    B: -4, Z: -3, X: -1, '*': -4,
  },
  K: {
    A: -1, R: 2, N: 0, D: -1, C: -3, Q: 1, E: 1, G: -2, H: -1, I: -3,
    L: -2, K: 5, M: -1, F: -3, P: -1, S: 0, T: -1, W: -3, Y: -2, V: -2,
    B: 0, Z: 1, X: -1, '*': -4,
  },
  M: {
    A: -1, R: -1, N: -2, D: -3, C: -1, Q: 0, E: -2, G: -3, H: -2, I: 1,
    L: 2, K: -1, M: 5, F: 0, P: -2, S: -1, T: -1, W: -1, Y: -1, V: 1,
    B: -3, Z: -1, X: -1, '*': -4,
  },
  F: {
    A: -2, R: -3, N: -3, D: -3, C: -2, Q: -3, E: -3, G: -3, H: -1, I: 0,
    L: 0, K: -3, M: 0, F: 6, P: -4, S: -2, T: -2, W: 1, Y: 3, V: -1,
    B: -3, Z: -3, X: -1, '*': -4,
  },
  P: {
    A: -1, R: -2, N: -2, D: -1, C: -3, Q: -1, E: -1, G: -2, H: -2, I: -3,
    L: -3, K: -1, M: -2, F: -4, P: 7, S: -1, T: -1, W: -4, Y: -3, V: -2,
    B: -2, Z: -1, X: -2, '*': -4,
  },
  S: {
    A: 1, R: -1, N: 1, D: 0, C: -1, Q: 0, E: 0, G: 0, H: -1, I: -2,
    L: -2, K: 0, M: -1, F: -2, P: -1, S: 4, T: 1, W: -3, Y: -2, V: -2,
    B: 0, Z: 0, X: 0, '*': -4,
  },
  T: {
    A: 0, R: -1, N: 0, D: -1, C: -1, Q: -1, E: -1, G: -2, H: -2, I: -1,
    L: -1, K: -1, M: -1, F: -2, P: -1, S: 1, T: 5, W: -2, Y: -2, V: 0,
    B: -1, Z: -1, X: 0, '*': -4,
  },
  W: {
    A: -3, R: -3, N: -4, D: -4, C: -2, Q: -2, E: -3, G: -2, H: -2, I: -3,
    L: -2, K: -3, M: -1, F: 1, P: -4, S: -3, T: -2, W: 11, Y: 2, V: -3,
    B: -4, Z: -3, X: -2, '*': -4,
  },
  Y: {
    A: -2, R: -2, N: -2, D: -3, C: -2, Q: -1, E: -2, G: -3, H: 2, I: -1,
    L: -1, K: -2, M: -1, F: 3, P: -3, S: -2, T: -2, W: 2, Y: 7, V: -1,
    B: -3, Z: -2, X: -1, '*': -4,
  },
  V: {
    A: 0, R: -3, N: -3, D: -3, C: -1, Q: -2, E: -2, G: -3, H: -3, I: 3,
    L: 1, K: -2, M: 1, F: -1, P: -2, S: -2, T: 0, W: -3, Y: -1, V: 4,
    B: -3, Z: -2, X: -1, '*': -4,
  },
  B: {
    A: -2, R: -1, N: 3, D: 4, C: -3, Q: 0, E: 1, G: -1, H: 0, I: -3,
    L: -4, K: 0, M: -3, F: -3, P: -2, S: 0, T: -1, W: -4, Y: -3, V: -3,
    B: 4, Z: 1, X: -1, '*': -4,
  },
  Z: {
    A: -1, R: 0, N: 0, D: 1, C: -3, Q: 3, E: 4, G: -2, H: 0, I: -3,
    L: -3, K: 1, M: -1, F: -3, P: -1, S: 0, T: -1, W: -3, Y: -2, V: -2,
    B: 1, Z: 4, X: -1, '*': -4,
  },
  X: {
    A: 0, R: -1, N: -1, D: -1, C: -2, Q: -1, E: -1, G: -1, H: -1, I: -1,
    L: -1, K: -1, M: -1, F: -1, P: -2, S: 0, T: 0, W: -2, Y: -1, V: -1,
    B: -1, Z: -1, X: -1, '*': -4,
  },
  '*': {
    A: -4, R: -4, N: -4, D: -4, C: -4, Q: -4, E: -4, G: -4, H: -4, I: -4,
    L: -4, K: -4, M: -4, F: -4, P: -4, S: -4, T: -4, W: -4, Y: -4, V: -4,
    B: -4, Z: -4, X: -4, '*': 1,
  },
}

function getBlosum62Score(a: string, b: string) {
  const upper_a = a.toUpperCase()
  const upper_b = b.toUpperCase()
  return BLOSUM62[upper_a]?.[upper_b] ?? -4
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
    return 1.0
  }

  // Convert similarity to distance using normalized BLOSUM62 score
  // Higher scores mean more similar, so we invert
  if (maxPossibleScore <= 0) {
    return 1.0
  }

  const normalizedScore = totalScore / maxPossibleScore
  // Clamp to valid range and convert to distance
  const clampedScore = Math.max(0.01, Math.min(1.0, normalizedScore))

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
    const r: Map<number, number> = new Map()
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
    // Leaf node - escape special characters in name
    const escapedName = node.name.replace(/[():,;[\]]/g, '_')
    result = escapedName
  } else {
    // Internal node
    const leftNewick = node.left
      ? nodeToNewick(node.left, node.leftLength)
      : ''
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
