import { types } from 'mobx-state-tree'

import { defaultBgColor, defaultColorSchemeName } from '../constants'

/**
 * #stateModel MSAModel
 */
function x() {} // eslint-disable-line @typescript-eslint/no-unused-vars

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
    }))
}
