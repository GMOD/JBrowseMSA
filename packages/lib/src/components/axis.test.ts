// @vitest-environment jsdom
import { Context } from '@jbrowse/svgcanvas'
import { expect, test } from 'vitest'

import { installSvgTestEnv } from '../svgTestUtil.ts'
import {
  axisTicks,
  drawAxis,
  positionLabel,
  valueLabel,
  valuePosition,
} from './axis.ts'

import type { ValueScale } from './axis.ts'

test('linear ticks step along the 1/2/5 ladder, at least the spacing apart', () => {
  const scale = { type: 'linear' as const, domain: [0, 4_600_000] as const }
  const { values, step } = axisTicks(scale, 80, 30)
  expect(step).toBe(2_000_000)
  expect(values).toEqual([0, 2_000_000, 4_000_000])
  expect(axisTicks(scale, 400, 30).step).toBe(500_000)
})

test('ticks start at the first step inside a domain that does not start on one', () => {
  const { values } = axisTicks(
    { type: 'linear', domain: [-1772, 12378] },
    600,
    30,
  )
  expect(values[0]).toBe(-1000)
  expect(values).toContain(0)
  expect(values.at(-1)).toBe(12000)
})

test('a domain of one value takes one tick', () => {
  expect(axisTicks({ type: 'linear', domain: [5, 5] }, 80, 30).values).toEqual([
    5,
  ])
})

test('log ticks fall on the powers of ten, or 1, 2 and 5 times one', () => {
  expect(
    axisTicks({ type: 'log', domain: [1, 100_000] }, 400, 30).values,
  ).toEqual([1, 10, 100, 1000, 10_000, 100_000])
  // a narrow axis skips decades to keep the spacing
  expect(
    axisTicks({ type: 'log', domain: [1, 100_000] }, 80, 30).values,
  ).toEqual([1, 100, 10_000])
  expect(axisTicks({ type: 'log', domain: [3, 40] }, 400, 30).values).toEqual([
    5, 10, 20,
  ])
})

test('labels print thousands as k, M and G, and positions as kb and Mb', () => {
  expect(valueLabel(4_000_000, 2_000_000)).toBe('4M')
  expect(valueLabel(1500, 500)).toBe('1500')
  expect(valueLabel(0.25, 0.05)).toBe('0.25')
  expect(positionLabel(-2000, 2000)).toBe('-2 kb')
  expect(positionLabel(12_000, 2000)).toBe('12 kb')
  expect(positionLabel(500, 100)).toBe('500')
})

test('a value sits along the extent, clamped to its ends', () => {
  const at = valuePosition({ type: 'linear', domain: [0, 10] }, [1, 101])
  expect(at(5)).toBe(51)
  expect(at(20)).toBe(101)
  const up = valuePosition({ type: 'linear', domain: [0, 10] }, [100, 0])
  expect(up(10)).toBe(0)
})

function axisSvg(
  orientation: 'top' | 'left',
  scale: ValueScale,
  extent: readonly [number, number],
) {
  installSvgTestEnv()
  const ctx = new Context(100, 100)
  drawAxis({ ctx, scale, extent, orientation, color: 'black' })
  return [
    ...ctx.getSvg().innerHTML.matchAll(/<text([^>]*)>([^<]*)<\/text>/g),
  ].map(m => ({
    text: m[2]!,
    x: Number(/ x="([^"]+)"/.exec(m[1]!)?.[1]),
    y: Number(/ y="([^"]+)"/.exec(m[1]!)?.[1]),
  }))
}

test('a top axis labels its ticks above the line, inside its extent', () => {
  const texts = axisSvg(
    'top',
    { type: 'linear', domain: [0, 4_600_000] },
    [1, 79],
  )
  expect(texts.map(t => t.text)).toEqual(['0', '2M', '4M'])
  expect(texts.every(t => t.y < 0)).toBe(true)
  expect(texts[0]!.x).toBeGreaterThan(1)
})

test('a left axis labels its ticks left of the line, the high end at the top', () => {
  const texts = axisSvg('left', { type: 'linear', domain: [0, 1] }, [100, 0])
  expect(texts.every(t => t.x < 0)).toBe(true)
  const top = texts.find(t => t.text === '1.0')
  const bottom = texts.find(t => t.text === '0.0')
  expect(top!.y).toBeLessThan(bottom!.y)
})
