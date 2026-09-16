// @vitest-environment jsdom
//
// The track label row. Zooming in grows the font against a tree area the leaf
// labels sized, so a long name can outgrow the space it has; what it must not
// do is wrap, which took the menu button onto a second line outside the
// track's height, underneath the next track's own button.
import React, { act } from 'react'

import { createRoot } from 'react-dom/client'
import { beforeAll, expect, test } from 'vitest'

import Track from './components/Track.tsx'
import {
  createTestModel,
  installSvgTestEnv,
  syntheticProteinMsa,
} from './svgTestUtil.ts'

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

beforeAll(() => {
  installSvgTestEnv()
})

test('a track name shares one unwrappable line with its menu button', () => {
  const model = createTestModel({
    id: 'track-label',
    data: { msa: syntheticProteinMsa(4, 20) },
  })
  const track = model.tracks.find(t => t.model.id === 'property-conservation')!
  const container = document.createElement('div')
  document.body.append(container)
  act(() => {
    createRoot(container).render(<Track model={model} track={track} />)
  })

  const label = container.querySelector<HTMLElement>('span[title]')!
  expect(label.textContent).toBe('Property conservation')
  expect(label.style.whiteSpace).toBe('nowrap')
  expect(label.style.textOverflow).toBe('ellipsis')

  const row = label.parentElement!
  expect(row.style.display).toBe('flex')
  expect(row.querySelector('button')).toBe(container.querySelector('button'))
})
