import * as React from 'react'

// a page that builds models with MSAModelF destroys each one it replaces, so
// the disposers its autoruns registered run
export { destroy } from '@jbrowse/mobx-state-tree'
export { default as MSAView } from './components/Loading.tsx'
export { mount } from './mount.tsx'
export { defineMsaElement } from './element.ts'
export { type MsaViewModel, default as MSAModelF } from './model.ts'

export * from 'react-dom/client'

export { React }
