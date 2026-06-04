import { describe, expect, test } from 'vitest'

import { setFontSize } from './setFontSize.ts'

describe('setFontSize', () => {
  test('replaces integer size, preserving family', () => {
    const ctx = { font: '10px sans-serif' }
    setFontSize(ctx, 16)
    expect(ctx.font).toBe('16px sans-serif')
  })

  test('handles fractional sizes from smooth zoom', () => {
    // regression: \d+ alone matched "8604" inside "14.8604px" and produced an
    // invalid string like "14 0.18px sans-serif", silently breaking fillText
    const ctx = { font: '14.8604px sans-serif' }
    setFontSize(ctx, 16.9372)
    expect(ctx.font).toBe('16.9372px sans-serif')
  })

  test('does not accumulate "bold " across re-renders', () => {
    const ctx = { font: '10px sans-serif' }
    setFontSize(ctx, 12, true)
    expect(ctx.font).toBe('bold 12px sans-serif')
    setFontSize(ctx, 14, true)
    expect(ctx.font).toBe('bold 14px sans-serif')
  })

  test('drops "bold " when bold goes false', () => {
    const ctx = { font: 'bold 12px sans-serif' }
    setFontSize(ctx, 14)
    expect(ctx.font).toBe('14px sans-serif')
  })
})
