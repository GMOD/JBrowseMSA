import { catalog } from './catalog'

import type { CatalogEntry } from './catalog'
import type { ComponentType } from 'react'

export { categoryOrder, slugOf } from './catalog'
export type { Category } from './catalog'

// Every capitalized .tsx file here is an example, joined to its catalog entry
// by filename.
const components = import.meta.glob<ComponentType>('./[A-Z]*.tsx', {
  eager: true,
  import: 'default',
})
const sources = import.meta.glob<string>('./[A-Z]*.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
})

export interface Example extends CatalogEntry {
  Component: ComponentType
  source: string
}

export const examples: Example[] = catalog.map(entry => {
  const path = `./${entry.id}.tsx`
  const Component = components[path]
  const source = sources[path]
  if (!Component || source === undefined) {
    throw new Error(`catalog entry ${entry.id} has no ${path}`)
  }
  return { ...entry, Component, source }
})
