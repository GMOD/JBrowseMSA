/**
 * SVGCanvas v2.0.3
 * Draw on SVG using Canvas's 2D Context API.
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Original Authors: Kerry Liu, Zeno Zeng
 * Copyright (c) 2014 Gliffy Inc.
 * Copyright (c) 2021 Zeno Zeng
 *
 * Vendored, converted to ESM/TypeScript, and cut down to the calls the
 * renderers make: rectangles, paths, arcs and glyphs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function getTextAnchor(textAlign: string): string {
  const mapping: Record<string, string> = {
    left: 'start',
    right: 'end',
    center: 'middle',
    start: 'start',
    end: 'end',
  }
  return mapping[textAlign] || mapping.start!
}

function getDominantBaseline(textBaseline: string): string {
  const mapping: Record<string, string> = {
    alphabetic: 'alphabetic',
    hanging: 'hanging',
    top: 'text-before-edge',
    bottom: 'text-after-edge',
    middle: 'central',
  }
  return mapping[textBaseline] || mapping.alphabetic!
}

/**
 * SVG's initial values for text presentation attributes. Omitting them from
 * every glyph takes ~22% off a sequence-logo figure.
 */
const TEXT_ATTR_DEFAULTS: Record<string, string> = {
  'font-style': 'normal',
  'font-weight': 'normal',
  // the initial value is `auto`, which resolves to the alphabetic baseline
  'dominant-baseline': 'alphabetic',
}

function omitDefault(attr: string, value: string | undefined) {
  return value === TEXT_ATTR_DEFAULTS[attr] ? undefined : value
}

const STYLES: Record<string, any> = {
  strokeStyle: {
    svgAttr: 'stroke',
    canvas: '#000000',
    svg: 'none',
    apply: 'stroke',
  },
  fillStyle: {
    svgAttr: 'fill',
    canvas: '#000000',
    svg: null,
    apply: 'fill',
  },
  lineWidth: {
    svgAttr: 'stroke-width',
    canvas: 1,
    svg: 1,
    apply: 'stroke',
  },
  font: {
    canvas: '10px sans-serif',
  },
  textAlign: {
    canvas: 'start',
  },
  textBaseline: {
    canvas: 'alphabetic',
  },
  // null on both sides so the canvas and svg defaults compare equal and strokes
  // carry no empty stroke-dasharray
  lineDash: {
    svgAttr: 'stroke-dasharray',
    canvas: null,
    svg: null,
    apply: 'stroke',
  },
}

const rgbaRegex =
  /rgba\(\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d?\.?\d*)\s*\)/i

interface ContextOptions {
  document?: Document
  ctx?: CanvasRenderingContext2D
}

export class Context {
  width: number
  height: number
  canvas: Context

  __document: Document
  __ctx: CanvasRenderingContext2D
  __canvas?: HTMLCanvasElement
  __root: SVGSVGElement
  __currentElement: SVGElement
  __styleStack: any[]
  __groupStack: SVGElement[]
  __currentDefaultPath: string
  __currentPosition: { x?: number; y?: number }
  __transformMatrix: DOMMatrix
  __transformMatrixStack?: DOMMatrix[]
  // parsed fonts keyed by `font` string; each parse costs a DOM element and a
  // CSS parse, and exports ask per glyph
  __fontCache = new Map<string, CSSStyleDeclaration>()

  strokeStyle: any
  fillStyle: any
  lineWidth: any
  font: any
  textAlign: any
  textBaseline: any
  lineDash: any

  constructor(width: number, height: number, options: ContextOptions = {}) {
    this.width = width
    this.height = height
    this.canvas = this
    this.__document = options.document || document

    if (options.ctx) {
      this.__ctx = options.ctx
    } else {
      this.__canvas = this.__document.createElement('canvas')
      this.__ctx = this.__canvas.getContext('2d')!
    }

    this.__setDefaultStyles()
    this.__styleStack = [this.__getStyleState()]
    this.__groupStack = []

    this.__root = this.__document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    )
    this.__root.setAttribute('version', '1.1')
    this.__root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    this.__root.setAttribute('width', String(width))
    this.__root.setAttribute('height', String(height))

    this.__currentElement = this.__document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g',
    )
    this.__root.appendChild(this.__currentElement)

    this.__currentDefaultPath = ''
    this.__currentPosition = {}
    this.__transformMatrix = new DOMMatrix()

    this.resetTransform()
  }

  __createElement(
    elementName: string,
    properties: Record<string, any> = {},
    resetFill?: boolean,
  ): SVGElement {
    const element = this.__document.createElementNS(
      'http://www.w3.org/2000/svg',
      elementName,
    )
    if (resetFill) {
      // placeholders: fill()/stroke() overwrite their own attribute, and
      // __applyStyleToCurrentElement drops the other when it is the svg default
      element.setAttribute('fill', 'none')
      element.setAttribute('stroke', 'none')
    }
    for (const key of Object.keys(properties)) {
      // __applyText passes optional attributes through unconditionally; skipping
      // unset ones keeps an invalid text-decoration="undefined" (~28 bytes) off
      // every glyph
      const value = properties[key]
      if (value !== undefined && value !== null) {
        element.setAttribute(key, value)
      }
    }
    return element
  }

  __setDefaultStyles() {
    for (const key of Object.keys(STYLES)) {
      ;(this as any)[key] = STYLES[key].canvas
    }
  }

  __applyStyleState(styleState: Record<string, any>) {
    for (const key of Object.keys(styleState)) {
      ;(this as any)[key] = styleState[key]
    }
  }

  __getStyleState(): Record<string, any> {
    const styleState: Record<string, any> = {}
    for (const key of Object.keys(STYLES)) {
      styleState[key] = (this as any)[key]
    }
    return styleState
  }

  /**
   * A pure translation folds into the element's x/y, saving ~35 bytes per
   * glyph. Any other transform, such as a sequence-logo letter's scale, is
   * written as a matrix.
   */
  __applyTransformation(element: SVGElement, matrix?: DOMMatrix) {
    const { a, b, c, d, e, f } = matrix || this.getTransform()
    if (
      a === 1 &&
      b === 0 &&
      c === 0 &&
      d === 1 &&
      element.hasAttribute('x') &&
      element.hasAttribute('y')
    ) {
      if (e !== 0) {
        element.setAttribute('x', String(Number(element.getAttribute('x')) + e))
      }
      if (f !== 0) {
        element.setAttribute('y', String(Number(element.getAttribute('y')) + f))
      }
      return
    }
    element.setAttribute('transform', `matrix(${a} ${b} ${c} ${d} ${e} ${f})`)
  }

  __applyStyleToCurrentElement(type: string) {
    const currentElement = this.__currentElement

    for (const key of Object.keys(STYLES)) {
      const style = STYLES[key]
      const value = (this as any)[key]
      if (!style.apply?.includes(type) || style.svg === value) {
        continue
      }
      const matches =
        (style.svgAttr === 'stroke' || style.svgAttr === 'fill') &&
        typeof value === 'string' &&
        value.includes('rgba')
          ? rgbaRegex.exec(value)
          : null
      if (matches) {
        // SVG has no rgba(); the alpha goes in the -opacity attribute
        currentElement.setAttribute(
          style.svgAttr,
          `rgb(${matches[1]},${matches[2]},${matches[3]})`,
        )
        currentElement.setAttribute(`${style.svgAttr}-opacity`, matches[4]!)
      } else if (key === 'lineWidth') {
        const scale = this.__getTransformScale()
        currentElement.setAttribute(
          style.svgAttr,
          String(value * Math.max(scale.x, scale.y)),
        )
      } else {
        currentElement.setAttribute(style.svgAttr, value)
      }
    }

    // svg defaults stroke to none, so a fill drops stroke="none". Fill defaults
    // to black, so a stroked element keeps fill="none".
    if (type === 'fill' && currentElement.getAttribute('stroke') === 'none') {
      currentElement.removeAttribute('stroke')
    }
  }

  __closestGroupOrSvg(node?: SVGElement): SVGElement {
    node = node || this.__currentElement
    if (node.nodeName === 'g' || node.nodeName === 'svg') {
      return node
    }
    return this.__closestGroupOrSvg(node.parentNode as SVGElement)
  }

  getSvg(): SVGSVGElement {
    return this.__root
  }

  save() {
    const group = this.__createElement('g')
    const parent = this.__closestGroupOrSvg()
    this.__groupStack.push(parent)
    parent.appendChild(group)
    this.__currentElement = group
    this.__styleStack.push(this.__getStyleState())
    if (!this.__transformMatrixStack) {
      this.__transformMatrixStack = []
    }
    this.__transformMatrixStack.push(this.getTransform())
  }

  restore() {
    this.__currentElement = this.__groupStack.pop()!
    if (!this.__currentElement) {
      this.__currentElement = this.__root.childNodes[0] as SVGElement
    }
    this.__applyStyleState(this.__styleStack.pop())
    if (this.__transformMatrixStack && this.__transformMatrixStack.length > 0) {
      this.setTransform(this.__transformMatrixStack.pop()!)
    }
  }

  beginPath() {
    this.__currentDefaultPath = ''
    this.__currentPosition = {}
    const path = this.__createElement('path', {}, true)
    this.__closestGroupOrSvg().appendChild(path)
    this.__currentElement = path
  }

  __applyCurrentDefaultPath() {
    if (this.__currentElement.nodeName === 'path') {
      this.__currentElement.setAttribute('d', this.__currentDefaultPath)
    }
  }

  __addPathCommand(command: string) {
    this.__currentDefaultPath += ' '
    this.__currentDefaultPath += command
  }

  moveTo(x: number, y: number) {
    if (this.__currentElement.nodeName !== 'path') {
      this.beginPath()
    }
    this.__currentPosition = { x, y }
    const p = this.__matrixTransform(x, y)
    this.__addPathCommand(`M ${p.x} ${p.y}`)
  }

  closePath() {
    if (this.__currentDefaultPath) {
      this.__addPathCommand('Z')
    }
  }

  lineTo(x: number, y: number) {
    this.__currentPosition = { x, y }
    const p = this.__matrixTransform(x, y)
    this.__addPathCommand(
      this.__currentDefaultPath.includes('M')
        ? `L ${p.x} ${p.y}`
        : `M ${p.x} ${p.y}`,
    )
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.__currentPosition = { x, y }
    const cp = this.__matrixTransform(cpx, cpy)
    const p = this.__matrixTransform(x, y)
    this.__addPathCommand(`Q ${cp.x} ${cp.y} ${p.x} ${p.y}`)
  }

  // paint-order matters only on an element with both fill and stroke: the
  // collapsed-clade triangle
  __applyPaintOrder(order: string, other: string) {
    const current = this.__currentElement
    if (
      current.nodeName === 'path' &&
      current.hasAttribute(other) &&
      current.getAttribute(other) !== 'none'
    ) {
      current.setAttribute('paint-order', order)
    }
  }

  stroke() {
    this.__applyPaintOrder('fill stroke markers', 'fill')
    this.__applyCurrentDefaultPath()
    this.__applyStyleToCurrentElement('stroke')
  }

  fill() {
    this.__applyPaintOrder('stroke fill markers', 'stroke')
    this.__applyCurrentDefaultPath()
    this.__applyStyleToCurrentElement('fill')
  }

  // A fill covering the whole context paints over what is under it, as on a
  // canvas; it does not clear the drawing.
  fillRect(x: number, y: number, width: number, height: number) {
    const rect = this.__createElement('rect', { x, y, width, height }, true)
    this.__closestGroupOrSvg().appendChild(rect)
    this.__currentElement = rect
    this.__applyTransformation(rect)
    this.__applyStyleToCurrentElement('fill')
  }

  strokeRect(x: number, y: number, width: number, height: number) {
    const rect = this.__createElement('rect', { x, y, width, height }, true)
    this.__closestGroupOrSvg().appendChild(rect)
    this.__currentElement = rect
    this.__applyTransformation(rect)
    this.__applyStyleToCurrentElement('stroke')
  }

  clearRect(x: number, y: number, width: number, height: number) {
    const { a, b, c, d, e, f } = this.getTransform()
    if (
      a === 1 &&
      b === 0 &&
      c === 0 &&
      d === 1 &&
      e === 0 &&
      f === 0 &&
      x === 0 &&
      y === 0 &&
      width === this.width &&
      height === this.height
    ) {
      this.__clearCanvas()
      return
    }
    const rect = this.__createElement(
      'rect',
      { x, y, width, height, fill: '#FFFFFF' },
      true,
    )
    this.__applyTransformation(rect)
    this.__closestGroupOrSvg().appendChild(rect)
  }

  __clearCanvas() {
    this.__root.removeChild(this.__root.childNodes[0]!)
    this.__currentElement = this.__document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g',
    )
    this.__root.appendChild(this.__currentElement)
    this.__groupStack = []
  }

  __parsedFont() {
    const hit = this.__fontCache.get(this.font)
    if (hit) {
      return hit
    }
    const el = document.createElement('span')
    el.setAttribute('style', `font:${this.font}`)
    this.__fontCache.set(this.font, el.style)
    return el.style
  }

  fillText(text: string, x: number, y: number) {
    const style = this.__parsedFont()
    const parent = this.__closestGroupOrSvg()
    const textElement = this.__createElement(
      'text',
      {
        'font-family': style.fontFamily,
        'font-size': style.fontSize,
        'font-style': omitDefault('font-style', style.fontStyle),
        'font-weight': omitDefault('font-weight', style.fontWeight),
        x,
        y,
        'text-anchor': getTextAnchor(this.textAlign),
        'dominant-baseline': omitDefault(
          'dominant-baseline',
          getDominantBaseline(this.textBaseline),
        ),
      },
      true,
    )

    textElement.appendChild(this.__document.createTextNode(text))
    this.__currentElement = textElement
    this.__applyTransformation(textElement)
    this.__applyStyleToCurrentElement('fill')
    parent.appendChild(textElement)
  }

  measureText(text: string): TextMetrics {
    this.__ctx.font = this.font
    return this.__ctx.measureText(text)
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterClockwise?: boolean,
  ) {
    if (startAngle === endAngle) {
      return
    }
    startAngle = startAngle % (2 * Math.PI)
    endAngle = endAngle % (2 * Math.PI)
    if (startAngle === endAngle) {
      endAngle =
        (endAngle + 2 * Math.PI - 0.001 * (counterClockwise ? -1 : 1)) %
        (2 * Math.PI)
    }
    const endX = x + radius * Math.cos(endAngle)
    const endY = y + radius * Math.sin(endAngle)
    const startX = x + radius * Math.cos(startAngle)
    const startY = y + radius * Math.sin(startAngle)
    const sweepFlag = counterClockwise ? 0 : 1
    let diff = endAngle - startAngle
    if (diff < 0) {
      diff += 2 * Math.PI
    }
    const largeArcFlag = counterClockwise
      ? diff > Math.PI
        ? 0
        : 1
      : diff > Math.PI
        ? 1
        : 0

    const { x: scaleX, y: scaleY } = this.__getTransformScale()
    const end = this.__matrixTransform(endX, endY)

    this.lineTo(startX, startY)
    this.__addPathCommand(
      `A ${radius * scaleX} ${radius * scaleY} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`,
    )
    this.__currentPosition = { x: endX, y: endY }
  }

  setLineDash(dashArray: number[]) {
    this.lineDash = dashArray.length > 0 ? dashArray.join(',') : null
  }

  setTransform(
    a: number | DOMMatrix,
    b?: number,
    c?: number,
    d?: number,
    e?: number,
    f?: number,
  ) {
    this.__transformMatrix =
      a instanceof DOMMatrix
        ? new DOMMatrix([a.a, a.b, a.c, a.d, a.e, a.f])
        : new DOMMatrix([a, b!, c!, d!, e!, f!])
  }

  getTransform(): DOMMatrix {
    const { a, b, c, d, e, f } = this.__transformMatrix
    return new DOMMatrix([a, b, c, d, e, f])
  }

  resetTransform() {
    this.setTransform(1, 0, 0, 1, 0, 0)
  }

  scale(x: number, y?: number) {
    if (y === undefined) {
      y = x
    }
    if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
      return
    }
    this.setTransform(this.getTransform().scale(x, y))
  }

  translate(x: number, y: number) {
    this.setTransform(this.getTransform().translate(x, y))
  }

  __matrixTransform(x: number, y: number): DOMPoint {
    return new DOMPoint(x, y).matrixTransform(this.__transformMatrix)
  }

  __getTransformScale(): { x: number; y: number } {
    return {
      x: Math.hypot(this.__transformMatrix.a, this.__transformMatrix.b),
      y: Math.hypot(this.__transformMatrix.c, this.__transformMatrix.d),
    }
  }
}
