import type { MsaViewModel } from '../../model.ts'

// Per-cell tile color for the active scheme. The scheme is fixed for the whole
// block, so resolve which rule applies once rather than re-testing the scheme
// name inside the innermost loop. Reading only the column table the active
// scheme needs also keeps the other one -- a per-column map for every column of
// the alignment -- from being computed at all.
export function tileColorFn(model: MsaViewModel) {
  const { colorSchemeName } = model
  if (colorSchemeName === 'clustalx_protein_dynamic') {
    const { colClustalX } = model
    return (col: number, letter: string) => colClustalX[col]![letter]
  }
  if (colorSchemeName === 'percent_identity_dynamic') {
    const { colConsensus } = model
    return (col: number, letter: string) => {
      const consensus = colConsensus[col]!
      return letter === consensus.letter ? consensus.color : undefined
    }
  }
  const { colorScheme } = model
  return (_col: number, letter: string) => colorScheme[letter]
}

// The column table the active scheme colors from, or undefined for the static
// schemes. Identity of this plus the scheme name is what a cache of rendered
// colors has to key on.
export function tileColorTable(model: MsaViewModel) {
  const { colorSchemeName } = model
  if (colorSchemeName === 'clustalx_protein_dynamic') {
    return model.colClustalX
  }
  if (colorSchemeName === 'percent_identity_dynamic') {
    return model.colConsensus
  }
  return model.colorScheme
}
