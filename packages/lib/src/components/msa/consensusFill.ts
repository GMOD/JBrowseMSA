import type { Theme } from '@mui/material'

/**
 * The cell under a residue matching its column's consensus where the reference
 * row has a gap: the purple a genome browser draws an insertion in, faded
 * toward the background so the residues that differ stand out on it
 */
export function consensusFill(theme: Theme) {
  return theme.palette.mode === 'dark' ? '#4a2d55' : '#e9d8f0'
}
