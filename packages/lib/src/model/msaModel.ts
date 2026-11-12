import { types } from '@jbrowse/mobx-state-tree'

import { defaultShowColumnStats } from '../constants.ts'
import { normalizedResidueColor } from '../residueColor.ts'
import { stripDefault } from '../stripDefault.ts'

import type { ResidueColor } from '../residueColor.ts'
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
       * the residue mark's color object, `{channel, field, scale}`: which of
       * the cell and the letter the color paints, whether the cell reads its
       * residue or the feature covering it, and the scheme or the letter
       * colors. See docs/layers.md
       */
      residueColor: stripDefault(types.frozen<ResidueColor>(), {}),

      /**
       * #property
       * show a tooltip with the hovered column's value for a track while
       * hovering that track: the conservation scores, the logo's composition,
       * an arc's partner columns
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
       * replace the residue color; a member left out takes its default
       */
      setResidueColor(color: ResidueColor) {
        self.residueColor = normalizedResidueColor(color)
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
