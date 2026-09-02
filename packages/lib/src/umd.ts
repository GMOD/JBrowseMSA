import * as React from 'react'

// a host that swaps models (the R htmlwidget on re-render) has to destroy the
// old one, or the disposers its autoruns registered never run
export { destroy } from '@jbrowse/mobx-state-tree'
export { default as MSAView } from './components/Loading.tsx'
export { type MsaViewModel, default as MSAModelF } from './model.ts'

export * from 'react-dom/client'

export { React }
