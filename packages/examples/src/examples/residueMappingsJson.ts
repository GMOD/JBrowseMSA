import type { ResidueMapping } from 'react-msaview'

interface JsonResidueMapping extends Omit<
  ResidueMapping,
  'structure' | 'unobserved'
> {
  structure: Omit<ResidueMapping['structure'], 'kind' | 'asymIdKind'> & {
    kind?: string
    asymIdKind?: string
  }
  unobserved?: number[][]
}

function structureKind(kind: string | undefined) {
  return kind === 'experimental' || kind === 'predicted' ? { kind } : {}
}

function asymIdKind(kind: string | undefined) {
  return kind === 'label' || kind === 'auth' ? { asymIdKind: kind } : {}
}

function pairs(spans: number[][]) {
  return spans.flatMap(([start, end]): [number, number][] =>
    start === undefined || end === undefined ? [] : [[start, end]],
  )
}

export function residueMappingsFromJson(
  mappings: JsonResidueMapping[],
): ResidueMapping[] {
  return mappings.map(
    ({
      structure: { kind, asymIdKind: idKind, ...structure },
      unobserved,
      ...rest
    }) => ({
      ...rest,
      structure: {
        ...structure,
        ...structureKind(kind),
        ...asymIdKind(idKind),
      },
      ...(unobserved ? { unobserved: pairs(unobserved) } : {}),
    }),
  )
}
