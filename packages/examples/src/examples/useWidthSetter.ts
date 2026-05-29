import { useEffect } from 'react'

import useMeasure from '@jbrowse/core/util/useMeasure'
import { isAlive } from '@jbrowse/mobx-state-tree'

// Measures the container and pushes the width into the model. The model-based
// MSAView (unlike the zero-config MSAViewer) does not measure itself, so the
// host app is responsible for keeping model.width in sync with the container.
export default function useWidthSetter(view: {
  setWidth: (arg: number) => void
}) {
  const [ref, { width }] = useMeasure()
  useEffect(() => {
    if (width && isAlive(view)) {
      requestAnimationFrame(() => {
        view.setWidth(width)
      })
    }
  }, [view, width])
  return ref
}
