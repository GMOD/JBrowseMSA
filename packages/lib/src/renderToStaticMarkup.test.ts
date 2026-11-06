import { expect, test } from 'vitest'

import { svgSafeColors } from './renderToStaticMarkup.ts'

test('an rgba fill becomes a hex color and a fill-opacity', () => {
  expect(svgSafeColors('<rect fill="rgba(255,140,0,0.28)"></rect>')).toBe(
    '<rect fill="#ff8c00" fill-opacity="0.28"></rect>',
  )
})

test('an opaque rgba drops the alpha, and an element with its own opacity keeps it', () => {
  expect(svgSafeColors('<rect stroke="rgba(0, 0, 0, 1)"></rect>')).toBe(
    '<rect stroke="#000000"></rect>',
  )
  expect(
    svgSafeColors('<rect fill="rgba(0,0,0,0.5)" fill-opacity="0.9"></rect>'),
  ).toBe('<rect fill="#000000" fill-opacity="0.9"></rect>')
})
