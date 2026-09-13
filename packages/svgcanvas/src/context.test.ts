// @vitest-environment jsdom
import { beforeAll, expect, test } from 'vitest'

import { Context } from './index.ts'

class Matrix {
  constructor(public m = [1, 0, 0, 1, 0, 0]) {}
  get a() {
    return this.m[0]!
  }
  get b() {
    return this.m[1]!
  }
  get c() {
    return this.m[2]!
  }
  get d() {
    return this.m[3]!
  }
  get e() {
    return this.m[4]!
  }
  get f() {
    return this.m[5]!
  }
  multiply(o: Matrix) {
    return new Matrix([
      this.a * o.a + this.c * o.b,
      this.b * o.a + this.d * o.b,
      this.a * o.c + this.c * o.d,
      this.b * o.c + this.d * o.d,
      this.a * o.e + this.c * o.f + this.e,
      this.b * o.e + this.d * o.f + this.f,
    ])
  }
  translate(x: number, y = 0) {
    return this.multiply(new Matrix([1, 0, 0, 1, x, y]))
  }
  scale(x: number, y = x) {
    return this.multiply(new Matrix([x, 0, 0, y, 0, 0]))
  }
}

beforeAll(() => {
  globalThis.DOMMatrix = Matrix as unknown as typeof DOMMatrix
})

test('a fill covering the whole context paints over, it does not clear', () => {
  const ctx = new Context(100, 50)
  ctx.fillStyle = '#123456'
  ctx.fillRect(0, 0, 10, 10)
  ctx.fillText('A', 1, 1)

  // a full-width highlight band is exactly this call, and it used to throw the
  // drawing away
  ctx.fillStyle = 'rgba(255,140,0,0.28)'
  ctx.fillRect(0, 0, 100, 50)

  const svg = ctx.getSvg().innerHTML
  expect(svg).toContain('>A<')
  expect(svg).toContain('#123456')
  expect(svg).toContain('fill-opacity="0.28"')
})

test('clearRect over the whole context still clears it', () => {
  const ctx = new Context(100, 50)
  ctx.fillText('A', 1, 1)
  ctx.clearRect(0, 0, 100, 50)

  expect(ctx.getSvg().innerHTML).not.toContain('>A<')
})
