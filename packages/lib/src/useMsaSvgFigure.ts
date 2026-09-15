import { useEffect, useState } from 'react'

import { createJBrowseTheme } from '@jbrowse/core/ui/theme'
import { getSnapshot } from '@jbrowse/mobx-state-tree'
import { compareStructural, reaction } from 'mobx'

import { renderToSvg } from './renderToSvg.tsx'

import type { MsaViewModel } from './model.ts'
import type { Theme } from '@mui/material'

export interface MsaSvgFigure {
  /** the SVG document for what is on screen, once the first draw finishes */
  svg?: string
  error?: unknown
}

/**
 * The viewer's SVG export of its viewport, as markup for the page to insert.
 * It redraws after the view settles: `delay` ms after the last scroll, zoom,
 * resize or change to the snapshot. A draw a later one overtakes is dropped.
 *
 * The figure's row names and letters are SVG text, so the browser's find
 * locates them, a reader can select them, and print stylesheets apply.
 */
export function useMsaSvgFigure(
  model: MsaViewModel,
  {
    theme,
    includeTracks = false,
    delay = 300,
  }: { theme?: Theme; includeTracks?: boolean; delay?: number } = {},
) {
  const [figure, setFigure] = useState<MsaSvgFigure>({})
  useEffect(() => {
    let latest = 0
    const dispose = reaction(
      () =>
        model.viewInitialized && model.dataInitialized
          ? [getSnapshot(model), model.width, model.height]
          : undefined,
      key => {
        if (!key) {
          return
        }
        const draw = ++latest
        renderToSvg(model, {
          theme: theme ?? createJBrowseTheme(),
          exportType: 'viewport',
          includeTracks,
        }).then(
          svg => {
            if (draw === latest) {
              setFigure({ svg })
            }
          },
          (error: unknown) => {
            if (draw === latest) {
              setFigure({ error })
            }
          },
        )
      },
      { delay, fireImmediately: true, equals: compareStructural },
    )
    return () => {
      latest = -1
      dispose()
    }
  }, [model, theme, includeTracks, delay])
  return figure
}
