import React from 'react'

import { createRoot } from 'react-dom/client'

import MSAViewer from './components/MSAViewer.tsx'

import type { MSAViewerProps } from './components/MSAViewer.tsx'

export interface MountedViewer {
  /** merge new props over the current ones */
  update: (props: Partial<MSAViewerProps>) => void
  destroy: () => void
}

/**
 * Render MSAViewer into an element, for a host that is not a React app: a
 * script tag, an R htmlwidget, a notebook widget, a custom element.
 */
export function mount(el: HTMLElement, props: MSAViewerProps): MountedViewer {
  const root = createRoot(el)
  let current = props
  root.render(<MSAViewer {...current} />)
  return {
    update(next) {
      current = { ...current, ...next }
      root.render(<MSAViewer {...current} />)
    },
    destroy() {
      root.unmount()
    },
  }
}
