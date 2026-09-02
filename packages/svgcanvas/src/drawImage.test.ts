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

const source = {
  width: 40,
  height: 30,
  toDataURL: () => 'data:image/png;base64,STUB',
}

test('a full-image draw is one image scaled onto the destination', () => {
  const ctx = new Context(200, 100)
  ctx.translate(5, 0)
  ctx.drawImage(source, 10, 20, 80, 60)
  const svg = ctx.getSerializedSvg()

  expect(svg).toContain('href="data:image/png;base64,STUB"')
  expect(svg).toContain('viewBox="0 0 40 30"')
  expect(svg).toContain('x="10" y="20" width="80" height="60"')
  expect(svg).toContain('transform="matrix(1 0 0 1 5 0)"')
})

test('a source rectangle crops through the viewBox', () => {
  const ctx = new Context(200, 100)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, 8, 4, 16, 8, 0, 0, 32, 16)
  const svg = ctx.getSerializedSvg()

  expect(svg).toContain('viewBox="8 4 16 8"')
  expect(svg).toContain('image-rendering="pixelated"')
})

test('an unreadable source is an error, not a silent gap', () => {
  const ctx = new Context(10, 10)
  expect(() => {
    ctx.drawImage({ width: 1, height: 1 }, 0, 0)
  }).toThrow(/toDataURL/)
})
