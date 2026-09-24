import type { MsaViewModel } from '../../model.ts'

// Per-cell tile color for the active scheme, resolved once per block. Reading
// only the active scheme's column table leaves the other per-column table
// uncomputed.
export function tileColorFn(model: MsaViewModel) {
  const { dynamicColorSchemeName } = model
  if (dynamicColorSchemeName === 'clustalx_protein_dynamic') {
    const { colClustalX } = model
    return (col: number, letter: string) => colClustalX[col]![letter]
  }
  if (dynamicColorSchemeName === 'percent_identity_dynamic') {
    const { colConsensus } = model
    return (col: number, letter: string) => {
      const consensus = colConsensus[col]!
      return letter === consensus.letter ? consensus.color : undefined
    }
  }
  const { colorScheme } = model
  return (_col: number, letter: string) => colorScheme[letter]
}

// The table the active scheme colors from: a dynamic scheme's per-column table,
// or the letter table of a static scheme or a `customColorScheme` map. A cache
// of rendered colors keys on its identity plus the scheme name.
export function tileColorTable(model: MsaViewModel) {
  const { dynamicColorSchemeName } = model
  if (dynamicColorSchemeName === 'clustalx_protein_dynamic') {
    return model.colClustalX
  }
  if (dynamicColorSchemeName === 'percent_identity_dynamic') {
    return model.colConsensus
  }
  return model.colorScheme
}
