import type { ComponentType } from 'react'

import ColorSchemes from './ColorSchemes'
import ColorSchemesSrc from './ColorSchemes.tsx?raw'
import LoadFromUrl from './LoadFromUrl'
import LoadFromUrlSrc from './LoadFromUrl.tsx?raw'
import ModelApi from './ModelApi'
import ModelApiSrc from './ModelApi.tsx?raw'
import NucleotideAlignment from './NucleotideAlignment'
import NucleotideAlignmentSrc from './NucleotideAlignment.tsx?raw'
import ProgrammaticControl from './ProgrammaticControl'
import ProgrammaticControlSrc from './ProgrammaticControl.tsx?raw'
import ZeroConfig from './ZeroConfig'
import ZeroConfigSrc from './ZeroConfig.tsx?raw'

export interface Example {
  name: string
  description: string
  Component: ComponentType
  source: string
}

export const examples: Example[] = [
  {
    name: 'Zero-config viewer',
    description:
      'The simplest usage: pass alignment + tree text as strings to MSAViewer.',
    Component: ZeroConfig,
    source: ZeroConfigSrc,
  },
  {
    name: 'Nucleotide alignment',
    description:
      'A DNA alignment with no tree, using a nucleotide color scheme.',
    Component: NucleotideAlignment,
    source: NucleotideAlignmentSrc,
  },
  {
    name: 'Color schemes',
    description:
      'Switch color schemes at runtime via model.setColorSchemeName.',
    Component: ColorSchemes,
    source: ColorSchemesSrc,
  },
  {
    name: 'Model API',
    description:
      'Create the model yourself with MSAModelF and render it with MSAView.',
    Component: ModelApi,
    source: ModelApiSrc,
  },
  {
    name: 'Programmatic control',
    description: 'Drive the viewer by calling model actions from buttons.',
    Component: ProgrammaticControl,
    source: ProgrammaticControlSrc,
  },
  {
    name: 'Load from URL',
    description:
      'Fetch a remote Stockholm alignment plus an InterProScan domain GFF.',
    Component: LoadFromUrl,
    source: LoadFromUrlSrc,
  },
]
