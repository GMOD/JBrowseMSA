const palettes = [
  ['#F8766D'],
  ['#F8766D', '#00BFC4'],
  ['#F8766D', '#00BA38', '#619CFF'],
  ['#F8766D', '#7CAE00', '#00BFC4', '#C77CFF'],
  ['#F8766D', '#A3A500', '#00BF7D', '#00B0F6', '#E76BF3'],
  ['#F8766D', '#B79F00', '#00BA38', '#00BFC4', '#619CFF', '#F564E3'],
  ['#F8766D', '#C49A00', '#53B400', '#00C094', '#00B6EB', '#A58AFF', '#FB61D7'],
  [
    '#F8766D',
    '#CD9600',
    '#7CAE00',
    '#00BE67',
    '#00BFC4',
    '#00A9FF',
    '#C77CFF',
    '#FF61CC',
  ],
]

export default palettes

/**
 * Fixed categorical palettes a scale names. `ggplot` is not one of them: it is
 * the ramp above, which picks its colors from the number of keys.
 */
export const namedPalettes: Record<string, readonly string[]> = {
  set1: [
    '#e41a1c',
    '#377eb8',
    '#4daf4a',
    '#984ea3',
    '#ff7f00',
    '#ffff33',
    '#a65628',
    '#f781bf',
    '#999999',
  ],
  dark2: [
    '#1b9e77',
    '#d95f02',
    '#7570b3',
    '#e7298a',
    '#66a61e',
    '#e6ab02',
    '#a6761d',
    '#666666',
  ],
  // Okabe-Ito, which stays distinguishable under the common forms of color
  // blindness
  okabeito: [
    '#e69f00',
    '#56b4e9',
    '#009e73',
    '#f0e442',
    '#0072b2',
    '#d55e00',
    '#cc79a7',
    '#000000',
  ],
  tableau: [
    '#4e79a7',
    '#f28e2b',
    '#e15759',
    '#76b7b2',
    '#59a14f',
    '#edc948',
    '#b07aa1',
    '#ff9da7',
    '#9c755f',
    '#bab0ac',
  ],
}

/**
 * The colors a palette name asks for. `ggplot`, an unknown name, and no name at
 * all give undefined, which `createPaletteMap` answers with the hue ramp.
 */
export function paletteNamed(name?: string) {
  return name === undefined ? undefined : namedPalettes[name]
}
