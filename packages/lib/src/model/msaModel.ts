import { types } from '@jbrowse/mobx-state-tree'

import { defaultBgColor, defaultColorSchemeName } from '../constants.ts'

import type { MSAFormat } from 'msa-parsers'

const msaFormats: MSAFormat[] = ['stockholm', 'a3m', 'fasta', 'emf', 'clustal']

/**
 * #stateModel MSAModel
 */
export function MSAModelF() {
  return types
    .model({
      /**
       * #property
       * draw MSA tiles with a background color
       */
      bgColor: defaultBgColor,

      /**
       * #property
       * default color scheme name
       */
      colorSchemeName: defaultColorSchemeName,

      /**
       * #property
       * force the MSA data to be parsed as a specific format instead of relying
       * on auto-detection (which is ambiguous between e.g. fasta and a3m)
       */
      msaFormat: types.maybe(types.enumeration<MSAFormat>('MSAFormat', msaFormats)),
    })
    .actions(self => ({
      /**
       * #action
       * set color scheme name
       */
      setColorSchemeName(name: string) {
        self.colorSchemeName = name
      },

      /**
       * #action
       */
      setBgColor(arg: boolean) {
        self.bgColor = arg
      },

      /**
       * #action
       * force a specific MSA parser, or pass undefined to auto-detect
       */
      setMSAFormat(arg?: MSAFormat) {
        self.msaFormat = arg
      },
    }))
}
