import { types } from '@jbrowse/mobx-state-tree'

import {
  defaultBgColor,
  defaultColorSchemeName,
  defaultShowColumnStats,
} from '../constants.ts'
import { stripDefault } from '../stripDefault.ts'

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
      bgColor: stripDefault(types.boolean, defaultBgColor),

      /**
       * #property
       * default color scheme name
       */
      colorSchemeName: stripDefault(types.string, defaultColorSchemeName),

      /**
       * #property
       * show a per-column statistics tooltip (consensus, conservation, gaps,
       * residue distribution) while hovering the alignment
       */
      showColumnStats: stripDefault(types.boolean, defaultShowColumnStats),

      /**
       * #property
       * force the MSA data to be parsed as a specific format instead of relying
       * on auto-detection (which is ambiguous between e.g. fasta and a3m)
       */
      msaFormat: types.maybe(
        types.enumeration<MSAFormat>('MSAFormat', msaFormats),
      ),
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
       */
      setShowColumnStats(arg: boolean) {
        self.showColumnStats = arg
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
