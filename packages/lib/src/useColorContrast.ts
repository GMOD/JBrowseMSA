import { useMemo } from 'react'

import { useTheme } from '@mui/material'

import { colorContrast } from './util.ts'

/**
 * Resolves the current theme and a memoized contrast-color scheme for a given
 * color scheme. Shared by the MSA and text-track canvas blocks.
 */
export function useColorContrast(colorScheme: Record<string, string>) {
  const theme = useTheme()
  const contrastScheme = useMemo(
    () => colorContrast(colorScheme, theme),
    [colorScheme, theme],
  )
  return { theme, contrastScheme }
}
