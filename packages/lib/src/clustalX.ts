// ClustalX consensus coloring.
// ref http://www.jalview.org/help/html/colourSchemes/clustal.html

import type { ColumnCounts } from './columnCounts.ts'

const BLUE = 'rgb(128,179,230)'
const RED = '#d88'
const MAGENTA_E = 'rgb(192, 72, 192)'
const MAGENTA_D = 'rgb(204, 77, 204)'
const GREEN = '#8f8'
const GREEN_ST = 'rgb(26,204,26)'
const PINK = 'rgb(240, 128, 128)'
const ORANGE = 'rgb(240, 144, 72)'
const YELLOW = 'rgb(204, 204, 0)'
const CYAN = 'rgb(26, 179, 179)'

/**
 * Computes the ClustalX letter->color map for a single alignment column, read
 * out of the alignment-wide `ColumnCounts` tally.
 */
export function clustalXColumnColors(counts: ColumnCounts, col: number) {
  const total = counts.total(col)
  const n = (letter: string) => counts.count(col, letter)
  const W = n('W')
  const L = n('L')
  const V = n('V')
  const I = n('I')
  const M = n('M')
  const A = n('A')
  const F = n('F')
  const C = n('C')
  const H = n('H')
  const P = n('P')
  const R = n('R')
  const K = n('K')
  const Q = n('Q')
  const E = n('E')
  const D = n('D')
  const T = n('T')
  const S = n('S')
  const G = n('G')
  const Y = n('Y')
  const N = n('N')

  const hydrophobic = W + L + V + I + M + A + F + C + H + P + Y
  const KR = K + R
  const QE = Q + E
  const ED = E + D
  const TS = T + S
  const p = (n: number) => n / total

  const colors: Record<string, string> = {}

  if (p(hydrophobic) > 0.6) {
    colors.W = BLUE
    colors.L = BLUE
    colors.V = BLUE
    colors.A = BLUE
    colors.I = BLUE
    colors.M = BLUE
    colors.F = BLUE
    colors.C = BLUE
  }

  if (p(KR) > 0.6 || p(K) > 0.8 || p(R) > 0.8 || p(Q) > 0.8) {
    colors.K = RED
    colors.R = RED
  }

  if (p(KR) > 0.6 || p(QE) > 0.5 || p(E) > 0.8 || p(Q) > 0.8 || p(D) > 0.8) {
    colors.E = MAGENTA_E
  }

  if (p(KR) > 0.6 || p(ED) > 0.5 || p(K) > 0.8 || p(R) > 0.8 || p(Q) > 0.8) {
    colors.D = MAGENTA_D
  }

  if (p(N) > 0.5 || p(Y) > 0.85) {
    colors.N = GREEN
  }

  if (
    p(KR) > 0.6 ||
    p(QE) > 0.6 ||
    p(Q) > 0.85 ||
    p(E) > 0.85 ||
    p(K) > 0.85 ||
    p(R) > 0.85
  ) {
    colors.Q = GREEN
  }

  if (p(hydrophobic) > 0.6 || p(TS) > 0.5 || p(S) > 0.85 || p(T) > 0.85) {
    colors.S = GREEN_ST
    colors.T = GREEN_ST
  }

  if (p(C) > 0.85) {
    colors.C = PINK
  }

  if (G > 0) {
    colors.G = ORANGE
  }

  if (P > 0) {
    colors.P = YELLOW
  }

  if (
    p(hydrophobic) > 0.6 ||
    p(W) > 0.85 ||
    p(Y) > 0.85 ||
    p(A) > 0.85 ||
    p(C) > 0.85 ||
    p(P) > 0.85 ||
    p(Q) > 0.85 ||
    p(F) > 0.85 ||
    p(H) > 0.85 ||
    p(I) > 0.85 ||
    p(L) > 0.85 ||
    p(M) > 0.85 ||
    p(V) > 0.85
  ) {
    colors.H = CYAN
    colors.Y = CYAN
  }

  return colors
}
