// Shared setup for the tests that drive renderToSvg headlessly.
import { enableStaticRendering } from 'mobx-react'

import { installHeadlessRenderEnv } from './headlessRenderEnv.ts'
import MSAModelF from './model.ts'

type Snapshot = NonNullable<
  Parameters<ReturnType<typeof MSAModelF>['create']>[0]
>

export function installSvgTestEnv(
  contextExtras?: Partial<CanvasRenderingContext2D>,
) {
  enableStaticRendering(true)
  installHeadlessRenderEnv(globalThis, contextExtras)
}

export function createTestModel(snapshot: Omit<Snapshot, 'type'>, width = 800) {
  const model = MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    height: 400,
    ...snapshot,
  })
  model.setWidth(width)
  return model
}

// a protein alignment with no two neighbouring cells alike, so any color or
// letter landing in the wrong cell shows up
export function syntheticProteinMsa(rows: number, cols: number) {
  const letters = 'ACDEFGHIKLMNPQRSTVWY'
  return Array.from({ length: rows }, (_, r) => {
    const seq = Array.from(
      { length: cols },
      (_, c) => letters[(r * 7 + c * 3) % letters.length],
    ).join('')
    return `>seq${r}\n${seq}`
  }).join('\n')
}
