// @vitest-environment jsdom
import { beforeAll, describe, expect, test } from 'vitest'

import MSAModelF from './model.ts'

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function () {
    let font = '10px sans-serif'
    return {
      get font() {
        return font
      },
      set font(v: string) {
        font = v
      },
      measureText(t: string) {
        const size = Number.parseFloat(font) || 10
        return { width: t.length * size * 0.6 } as TextMetrics
      },
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
})

// col0 is invariant M; col3 varies V/V/A (all hydrophobic) so property
// conservation stays high while identity conservation drops
const protein = `>a
MKLVIL
>b
MRLVIL
>c
MKLAIL`

const dna = `>a
ACGTAC
>b
ACGTAG
>c
ACGAAC`

function make(msa: string, id: string) {
  return MSAModelF().create({
    id,
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa },
  })
}

describe('property conservation track', () => {
  test('present for protein alignments', () => {
    const ids = make(protein, 'p').tracks.map(t => t.model.id)
    expect(ids).toContain('conservation')
    expect(ids).toContain('property-conservation')
  })

  test('omitted for nucleotide alignments', () => {
    const ids = make(dna, 'd').tracks.map(t => t.model.id)
    expect(ids).toContain('conservation')
    expect(ids).not.toContain('property-conservation')
  })

  test('conservative-substitution column: property beats identity', () => {
    const model = make(protein, 'pc')
    // col3 = V/V/A: same property class, different identity
    expect(model.propertyConservation[3]!).toBeGreaterThan(
      model.conservation[3]!,
    )
  })
})

describe('mouseOverColumnStats', () => {
  test('undefined when nothing hovered', () => {
    expect(make(protein, 'm0').mouseOverColumnStats).toBeUndefined()
  })

  test('reports consensus, gaps and distribution for hovered column', () => {
    const model = make(protein, 'm1')
    model.setMousePos(0, 0)
    const s = model.mouseOverColumnStats
    expect(s?.consensusLetter).toBe('M')
    expect(s?.consensusFraction).toBe(1)
    expect(s?.gapFraction).toBe(0)
    expect(s?.total).toBe(3)
  })

  test('mixed column reports the majority residue as consensus', () => {
    const model = make(protein, 'm2')
    // col1 = K/R/K -> consensus K at 2/3
    model.setMousePos(1, 0)
    const s = model.mouseOverColumnStats
    expect(s?.consensusLetter).toBe('K')
    expect(s?.consensusCount).toBe(2)
  })
})
