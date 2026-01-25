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
 * Vendored and converted to ESM/TypeScript for pure ESM compatibility.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

function toString(obj: any): string {
  if (!obj) {
    return obj
  }
  if (typeof obj === 'string') {
    return obj
  }
  return obj + ''
}

function format(str: string, args: Record<string, any>): string {
  const keys = Object.keys(args)
  for (const key of keys) {
    str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), args[key])
  }
  return str
}

function randomString(holder: Record<string, string>): string {
  if (!holder) {
    throw new Error(
      'cannot create a random attribute name for an undefined object',
    )
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'
  let randomstring = ''
  do {
    randomstring = ''
    for (let i = 0; i < 12; i++) {
      randomstring += chars[Math.floor(Math.random() * chars.length)]
    }
  } while (holder[randomstring])
  return randomstring
}

function createNamedToNumberedLookup(
  items: string,
  radix: number = 10,
): Record<string, string> {
  const lookup: Record<string, string> = {}
  const parts = items.split(',')
  for (let i = 0; i < parts.length; i += 2) {
    const entity = '&' + parts[i + 1] + ';'
    const base10 = parseInt(parts[i]!, radix)
    lookup[entity] = '&#' + base10 + ';'
  }
  lookup['\\xa0'] = '&#160;'
  return lookup
}

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

const namedEntities = createNamedToNumberedLookup(
  '50,nbsp,51,iexcl,52,cent,53,pound,54,curren,55,yen,56,brvbar,57,sect,58,uml,59,copy,' +
    '5a,ordf,5b,laquo,5c,not,5d,shy,5e,reg,5f,macr,5g,deg,5h,plusmn,5i,sup2,5j,sup3,5k,acute,' +
    '5l,micro,5m,para,5n,middot,5o,cedil,5p,sup1,5q,ordm,5r,raquo,5s,frac14,5t,frac12,5u,frac34,' +
    '5v,iquest,60,Agrave,61,Aacute,62,Acirc,63,Atilde,64,Auml,65,Aring,66,AElig,67,Ccedil,' +
    '68,Egrave,69,Eacute,6a,Ecirc,6b,Euml,6c,Igrave,6d,Iacute,6e,Icirc,6f,Iuml,6g,ETH,6h,Ntilde,' +
    '6i,Ograve,6j,Oacute,6k,Ocirc,6l,Otilde,6m,Ouml,6n,times,6o,Oslash,6p,Ugrave,6q,Uacute,' +
    '6r,Ucirc,6s,Uuml,6t,Yacute,6u,THORN,6v,szlig,70,agrave,71,aacute,72,acirc,73,atilde,74,auml,' +
    '75,aring,76,aelig,77,ccedil,78,egrave,79,eacute,7a,ecirc,7b,euml,7c,igrave,7d,iacute,7e,icirc,' +
    '7f,iuml,7g,eth,7h,ntilde,7i,ograve,7j,oacute,7k,ocirc,7l,otilde,7m,ouml,7n,divide,7o,oslash,' +
    '7p,ugrave,7q,uacute,7r,ucirc,7s,uuml,7t,yacute,7u,thorn,7v,yuml,ci,fnof,sh,Alpha,si,Beta,' +
    'sj,Gamma,sk,Delta,sl,Epsilon,sm,Zeta,sn,Eta,so,Theta,sp,Iota,sq,Kappa,sr,Lambda,ss,Mu,' +
    'st,Nu,su,Xi,sv,Omicron,t0,Pi,t1,Rho,t3,Sigma,t4,Tau,t5,Upsilon,t6,Phi,t7,Chi,t8,Psi,' +
    't9,Omega,th,alpha,ti,beta,tj,gamma,tk,delta,tl,epsilon,tm,zeta,tn,eta,to,theta,tp,iota,' +
    'tq,kappa,tr,lambda,ts,mu,tt,nu,tu,xi,tv,omicron,u0,pi,u1,rho,u2,sigmaf,u3,sigma,u4,tau,' +
    'u5,upsilon,u6,phi,u7,chi,u8,psi,u9,omega,uh,thetasym,ui,upsih,um,piv,812,bull,816,hellip,' +
    '81i,prime,81j,Prime,81u,oline,824,frasl,88o,weierp,88h,image,88s,real,892,trade,89l,alefsym,' +
    '8cg,larr,8ch,uarr,8ci,rarr,8cj,darr,8ck,harr,8dl,crarr,8eg,lArr,8eh,uArr,8ei,rArr,8ej,dArr,' +
    '8ek,hArr,8g0,forall,8g2,part,8g3,exist,8g5,empty,8g7,nabla,8g8,isin,8g9,notin,8gb,ni,8gf,prod,' +
    '8gh,sum,8gi,minus,8gn,lowast,8gq,radic,8gt,prop,8gu,infin,8h0,ang,8h7,and,8h8,or,8h9,cap,8ha,cup,' +
    '8hb,int,8hk,there4,8hs,sim,8i5,cong,8i8,asymp,8j0,ne,8j1,equiv,8j4,le,8j5,ge,8k2,sub,8k3,sup,8k4,' +
    'nsub,8k6,sube,8k7,supe,8kl,oplus,8kn,otimes,8l5,perp,8m5,sdot,8o8,lceil,8o9,rceil,8oa,lfloor,8ob,' +
    'rfloor,8p9,lang,8pa,rang,9ea,loz,9j0,spades,9j3,clubs,9j5,hearts,9j6,diams,ai,OElig,aj,oelig,b0,' +
    'Scaron,b1,scaron,bo,Yuml,m6,circ,ms,tilde,802,ensp,803,emsp,809,thinsp,80c,zwnj,80d,zwj,80e,lrm,' +
    '80f,rlm,80j,ndash,80k,mdash,80o,lsquo,80p,rsquo,80q,sbquo,80s,ldquo,80t,rdquo,80u,bdquo,810,dagger,' +
    '811,Dagger,81g,permil,81p,lsaquo,81q,rsaquo,85c,euro',
  32,
)

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
  lineCap: {
    svgAttr: 'stroke-linecap',
    canvas: 'butt',
    svg: 'butt',
    apply: 'stroke',
  },
  lineJoin: {
    svgAttr: 'stroke-linejoin',
    canvas: 'miter',
    svg: 'miter',
    apply: 'stroke',
  },
  miterLimit: {
    svgAttr: 'stroke-miterlimit',
    canvas: 10,
    svg: 4,
    apply: 'stroke',
  },
  lineWidth: {
    svgAttr: 'stroke-width',
    canvas: 1,
    svg: 1,
    apply: 'stroke',
  },
  globalAlpha: {
    svgAttr: 'opacity',
    canvas: 1,
    svg: 1,
    apply: 'fill stroke',
  },
  font: {
    canvas: '10px sans-serif',
  },
  shadowColor: {
    canvas: '#000000',
  },
  shadowOffsetX: {
    canvas: 0,
  },
  shadowOffsetY: {
    canvas: 0,
  },
  shadowBlur: {
    canvas: 0,
  },
  textAlign: {
    canvas: 'start',
  },
  textBaseline: {
    canvas: 'alphabetic',
  },
  lineDash: {
    svgAttr: 'stroke-dasharray',
    canvas: [],
    svg: null,
    apply: 'stroke',
  },
}

class CanvasGradient {
  __root: SVGElement
  __ctx: Context

  constructor(gradientNode: SVGElement, ctx: Context) {
    this.__root = gradientNode
    this.__ctx = ctx
  }

  addColorStop(offset: number, color: string) {
    const stop = this.__ctx.__createElement('stop')
    stop.setAttribute('offset', String(offset))
    if (toString(color).includes('rgba')) {
      const regex =
        /rgba\(\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d?\.?\d*)\s*\)/gi
      const matches = regex.exec(color)
      if (matches) {
        stop.setAttribute(
          'stop-color',
          format('rgb({r},{g},{b})', {
            r: matches[1],
            g: matches[2],
            b: matches[3],
          }),
        )
        stop.setAttribute('stop-opacity', matches[4]!)
      }
    } else {
      stop.setAttribute('stop-color', toString(color))
    }
    this.__root.appendChild(stop)
  }
}

class CanvasPattern {
  __root: SVGElement
  __ctx: Context

  constructor(pattern: SVGElement, ctx: Context) {
    this.__root = pattern
    this.__ctx = ctx
  }
}

interface ContextOptions {
  width?: number
  height?: number
  enableMirroring?: boolean
  document?: Document
  ctx?: CanvasRenderingContext2D
  debug?: boolean
}

export class Context {
  width: number
  height: number
  enableMirroring: boolean
  canvas: Context

  __document: Document
  __ctx: CanvasRenderingContext2D
  __canvas?: HTMLCanvasElement
  __root: SVGSVGElement
  __ids: Record<string, string>
  __defs: SVGDefsElement
  __currentElement: SVGElement
  __styleStack: any[]
  __groupStack: SVGElement[]
  __currentDefaultPath: string
  __currentPosition: { x?: number; y?: number }
  __transformMatrix: DOMMatrix
  __transformMatrixStack?: DOMMatrix[]
  __currentElementsToStyle?: { element: SVGElement; children: SVGElement[] }
  __options: ContextOptions
  __id: string
  __fontUnderline?: string
  __fontHref?: string

  // Style properties
  strokeStyle: any
  fillStyle: any
  lineCap: any
  lineJoin: any
  miterLimit: any
  lineWidth: any
  globalAlpha: any
  font: any
  shadowColor: any
  shadowOffsetX: any
  shadowOffsetY: any
  shadowBlur: any
  textAlign: any
  textBaseline: any
  lineDash: any

  constructor(o?: ContextOptions | number, height?: number) {
    const defaultOptions = { width: 500, height: 500, enableMirroring: false }
    let options: ContextOptions

    if (typeof o === 'number' && height !== undefined) {
      options = { ...defaultOptions, width: o, height }
    } else if (!o) {
      options = defaultOptions
    } else if (typeof o === 'object') {
      options = o
    } else {
      options = defaultOptions
    }

    this.width = options.width || defaultOptions.width
    this.height = options.height || defaultOptions.height
    this.enableMirroring =
      options.enableMirroring !== undefined
        ? options.enableMirroring
        : defaultOptions.enableMirroring

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
    this.__root.setAttributeNS(
      'http://www.w3.org/2000/xmlns/',
      'xmlns:xlink',
      'http://www.w3.org/1999/xlink',
    )
    this.__root.setAttribute('width', String(this.width))
    this.__root.setAttribute('height', String(this.height))

    this.__ids = {}

    this.__defs = this.__document.createElementNS(
      'http://www.w3.org/2000/svg',
      'defs',
    )
    this.__root.appendChild(this.__defs)

    this.__currentElement = this.__document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g',
    )
    this.__root.appendChild(this.__currentElement)

    this.__currentDefaultPath = ''
    this.__currentPosition = {}
    this.__transformMatrix = new DOMMatrix()

    this.resetTransform()

    this.__options = options
    this.__id = Math.random().toString(16).substring(2, 8)
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
      element.setAttribute('fill', 'none')
      element.setAttribute('stroke', 'none')
    }
    for (const key of Object.keys(properties)) {
      element.setAttribute(key, properties[key])
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

  __applyTransformation(element: SVGElement, matrix?: DOMMatrix) {
    const { a, b, c, d, e, f } = matrix || this.getTransform()
    element.setAttribute('transform', `matrix(${a} ${b} ${c} ${d} ${e} ${f})`)
  }

  __applyStyleToCurrentElement(type: string) {
    let currentElement = this.__currentElement
    const currentStyleGroup = this.__currentElementsToStyle
    if (currentStyleGroup) {
      currentElement.setAttribute(type, '')
      currentElement = currentStyleGroup.element
      for (const node of currentStyleGroup.children) {
        node.setAttribute(type, '')
      }
    }

    const keys = Object.keys(STYLES)
    for (const key of keys) {
      const style = STYLES[key]
      const value = (this as any)[key]
      if (style.apply) {
        if (value instanceof CanvasPattern) {
          if (value.__ctx) {
            for (const node of Array.from(value.__ctx.__defs.childNodes)) {
              const id = (node as Element).getAttribute('id')
              if (id) {
                this.__ids[id] = id
                this.__defs.appendChild(node)
              }
            }
          }
          currentElement.setAttribute(
            style.apply,
            format('url(#{id})', { id: value.__root.getAttribute('id') }),
          )
        } else if (value instanceof CanvasGradient) {
          currentElement.setAttribute(
            style.apply,
            format('url(#{id})', { id: value.__root.getAttribute('id') }),
          )
        } else if (style.apply.includes(type) && style.svg !== value) {
          if (
            (style.svgAttr === 'stroke' || style.svgAttr === 'fill') &&
            value &&
            value.includes('rgba')
          ) {
            const regex =
              /rgba\(\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\s*,\s*(\d?\.?\d*)\s*\)/gi
            const matches = regex.exec(value)
            if (matches) {
              currentElement.setAttribute(
                style.svgAttr,
                format('rgb({r},{g},{b})', {
                  r: matches[1],
                  g: matches[2],
                  b: matches[3],
                }),
              )
              let opacity = Number(matches[4])
              const globalAlpha = this.globalAlpha
              if (globalAlpha != null) {
                opacity *= globalAlpha
              }
              currentElement.setAttribute(
                style.svgAttr + '-opacity',
                String(opacity),
              )
            }
          } else {
            let attr = style.svgAttr
            let val = value
            if (key === 'globalAlpha') {
              attr = type + '-' + style.svgAttr
              if (currentElement.getAttribute(attr)) {
                continue
              }
            } else if (key === 'lineWidth') {
              const scale = this.__getTransformScale()
              val = value * Math.max(scale.x, scale.y)
            }
            currentElement.setAttribute(attr, val)
          }
        }
      }
    }
  }

  __closestGroupOrSvg(node?: SVGElement): SVGElement {
    node = node || this.__currentElement
    if (node.nodeName === 'g' || node.nodeName === 'svg') {
      return node
    }
    return this.__closestGroupOrSvg(node.parentNode as SVGElement)
  }

  getSerializedSvg(fixNamedEntities?: boolean): string {
    let serialized = new XMLSerializer().serializeToString(this.__root)
    const xmlns =
      /xmlns="http:\/\/www\.w3\.org\/2000\/svg".+xmlns="http:\/\/www\.w3\.org\/2000\/svg/gi
    if (xmlns.test(serialized)) {
      serialized = serialized.replace(
        'xmlns="http://www.w3.org/2000/svg',
        'xmlns:xlink="http://www.w3.org/1999/xlink',
      )
    }

    if (fixNamedEntities) {
      for (const key of Object.keys(namedEntities)) {
        const regexp = new RegExp(key, 'gi')
        if (regexp.test(serialized)) {
          serialized = serialized.replace(regexp, namedEntities[key]!)
        }
      }
    }

    return serialized
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
    const style = this.__getStyleState()
    this.__styleStack.push(style)
    if (!this.__transformMatrixStack) {
      this.__transformMatrixStack = []
    }
    this.__transformMatrixStack.push(this.getTransform())
  }

  restore() {
    this.__currentElement = this.__groupStack.pop()!
    this.__currentElementsToStyle = undefined
    if (!this.__currentElement) {
      this.__currentElement = this.__root.childNodes[1] as SVGElement
    }
    const state = this.__styleStack.pop()
    this.__applyStyleState(state)
    if (this.__transformMatrixStack && this.__transformMatrixStack.length > 0) {
      this.setTransform(this.__transformMatrixStack.pop()!)
    }
  }

  beginPath() {
    this.__currentDefaultPath = ''
    this.__currentPosition = {}
    const path = this.__createElement('path', {}, true)
    const parent = this.__closestGroupOrSvg()
    parent.appendChild(path)
    this.__currentElement = path
  }

  __applyCurrentDefaultPath() {
    const currentElement = this.__currentElement
    if (currentElement.nodeName === 'path') {
      currentElement.setAttribute('d', this.__currentDefaultPath)
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
    this.__addPathCommand(
      format('M {x} {y}', {
        x: this.__matrixTransform(x, y).x,
        y: this.__matrixTransform(x, y).y,
      }),
    )
  }

  closePath() {
    if (this.__currentDefaultPath) {
      this.__addPathCommand('Z')
    }
  }

  lineTo(x: number, y: number) {
    this.__currentPosition = { x, y }
    if (this.__currentDefaultPath.includes('M')) {
      this.__addPathCommand(
        format('L {x} {y}', {
          x: this.__matrixTransform(x, y).x,
          y: this.__matrixTransform(x, y).y,
        }),
      )
    } else {
      this.__addPathCommand(
        format('M {x} {y}', {
          x: this.__matrixTransform(x, y).x,
          y: this.__matrixTransform(x, y).y,
        }),
      )
    }
  }

  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ) {
    this.__currentPosition = { x, y }
    this.__addPathCommand(
      format('C {cp1x} {cp1y} {cp2x} {cp2y} {x} {y}', {
        cp1x: this.__matrixTransform(cp1x, cp1y).x,
        cp1y: this.__matrixTransform(cp1x, cp1y).y,
        cp2x: this.__matrixTransform(cp2x, cp2y).x,
        cp2y: this.__matrixTransform(cp2x, cp2y).y,
        x: this.__matrixTransform(x, y).x,
        y: this.__matrixTransform(x, y).y,
      }),
    )
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.__currentPosition = { x, y }
    this.__addPathCommand(
      format('Q {cpx} {cpy} {x} {y}', {
        cpx: this.__matrixTransform(cpx, cpy).x,
        cpy: this.__matrixTransform(cpx, cpy).y,
        x: this.__matrixTransform(x, y).x,
        y: this.__matrixTransform(x, y).y,
      }),
    )
  }

  stroke() {
    if (this.__currentElement.nodeName === 'path') {
      this.__currentElement.setAttribute('paint-order', 'fill stroke markers')
    }
    this.__applyCurrentDefaultPath()
    this.__applyStyleToCurrentElement('stroke')
  }

  fill() {
    if (this.__currentElement.nodeName === 'path') {
      this.__currentElement.setAttribute('paint-order', 'stroke fill markers')
    }
    this.__applyCurrentDefaultPath()
    this.__applyStyleToCurrentElement('fill')
  }

  rect(x: number, y: number, width: number, height: number) {
    if (this.__currentElement.nodeName !== 'path') {
      this.beginPath()
    }
    this.moveTo(x, y)
    this.lineTo(x + width, y)
    this.lineTo(x + width, y + height)
    this.lineTo(x, y + height)
    this.lineTo(x, y)
    this.closePath()
  }

  __clearCanvas() {
    const rootGroup = this.__root.childNodes[1]!
    this.__root.removeChild(rootGroup)
    this.__currentElement = this.__document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g',
    )
    this.__root.appendChild(this.__currentElement)
    this.__groupStack = []
  }

  fillRect(x: number, y: number, width: number, height: number) {
    const { a, b, c, d, e, f } = this.getTransform()
    if (
      JSON.stringify([a, b, c, d, e, f]) === JSON.stringify([1, 0, 0, 1, 0, 0])
    ) {
      if (
        x === 0 &&
        y === 0 &&
        width === this.width &&
        height === this.height
      ) {
        this.__clearCanvas()
      }
    }
    const rect = this.__createElement('rect', { x, y, width, height }, true)
    const parent = this.__closestGroupOrSvg()
    parent.appendChild(rect)
    this.__currentElement = rect
    this.__applyTransformation(rect)
    this.__applyStyleToCurrentElement('fill')
  }

  strokeRect(x: number, y: number, width: number, height: number) {
    const rect = this.__createElement('rect', { x, y, width, height }, true)
    const parent = this.__closestGroupOrSvg()
    parent.appendChild(rect)
    this.__currentElement = rect
    this.__applyTransformation(rect)
    this.__applyStyleToCurrentElement('stroke')
  }

  clearRect(x: number, y: number, width: number, height: number) {
    const { a, b, c, d, e, f } = this.getTransform()
    if (
      JSON.stringify([a, b, c, d, e, f]) === JSON.stringify([1, 0, 0, 1, 0, 0])
    ) {
      if (
        x === 0 &&
        y === 0 &&
        width === this.width &&
        height === this.height
      ) {
        this.__clearCanvas()
        return
      }
    }
    const rect = this.__createElement(
      'rect',
      { x, y, width, height, fill: '#FFFFFF' },
      true,
    )
    this.__applyTransformation(rect)
    const parent = this.__closestGroupOrSvg()
    parent.appendChild(rect)
  }

  createLinearGradient(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): CanvasGradient {
    const grad = this.__createElement('linearGradient', {
      id: randomString(this.__ids),
      x1: x1 + 'px',
      x2: x2 + 'px',
      y1: y1 + 'px',
      y2: y2 + 'px',
      gradientUnits: 'userSpaceOnUse',
    })
    this.__defs.appendChild(grad)
    return new CanvasGradient(grad, this)
  }

  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): CanvasGradient {
    const grad = this.__createElement('radialGradient', {
      id: randomString(this.__ids),
      cx: x1 + 'px',
      cy: y1 + 'px',
      r: r1 + 'px',
      fx: x0 + 'px',
      fy: y0 + 'px',
      gradientUnits: 'userSpaceOnUse',
    })
    this.__defs.appendChild(grad)
    return new CanvasGradient(grad, this)
  }

  __applyText(text: string, x: number, y: number, action: string) {
    const el = document.createElement('span')
    el.setAttribute('style', 'font:' + this.font)

    const style = el.style
    const parent = this.__closestGroupOrSvg()
    const textElement = this.__createElement(
      'text',
      {
        'font-family': style.fontFamily,
        'font-size': style.fontSize,
        'font-style': style.fontStyle,
        'font-weight': style.fontWeight,
        'text-decoration': this.__fontUnderline,
        x: x,
        y: y,
        'text-anchor': getTextAnchor(this.textAlign),
        'dominant-baseline': getDominantBaseline(this.textBaseline),
      },
      true,
    )

    textElement.appendChild(this.__document.createTextNode(text))
    this.__currentElement = textElement
    this.__applyTransformation(textElement)
    this.__applyStyleToCurrentElement(action)

    let finalElement: SVGElement = textElement
    if (this.__fontHref) {
      const a = this.__createElement('a')
      a.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'xlink:href',
        this.__fontHref,
      )
      a.appendChild(textElement)
      finalElement = a
    }

    parent.appendChild(finalElement)
  }

  fillText(text: string, x: number, y: number) {
    this.__applyText(text, x, y, 'fill')
  }

  strokeText(text: string, x: number, y: number) {
    this.__applyText(text, x, y, 'stroke')
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
    let largeArcFlag = 0
    let diff = endAngle - startAngle

    if (diff < 0) {
      diff += 2 * Math.PI
    }

    if (counterClockwise) {
      largeArcFlag = diff > Math.PI ? 0 : 1
    } else {
      largeArcFlag = diff > Math.PI ? 1 : 0
    }

    const scaleX = Math.hypot(
      this.__transformMatrix.a,
      this.__transformMatrix.b,
    )
    const scaleY = Math.hypot(
      this.__transformMatrix.c,
      this.__transformMatrix.d,
    )

    this.lineTo(startX, startY)
    this.__addPathCommand(
      format(
        'A {rx} {ry} {xAxisRotation} {largeArcFlag} {sweepFlag} {endX} {endY}',
        {
          rx: radius * scaleX,
          ry: radius * scaleY,
          xAxisRotation: 0,
          largeArcFlag,
          sweepFlag,
          endX: this.__matrixTransform(endX, endY).x,
          endY: this.__matrixTransform(endX, endY).y,
        },
      ),
    )

    this.__currentPosition = { x: endX, y: endY }
  }

  clip() {
    const group = this.__closestGroupOrSvg()
    const clipPath = this.__createElement('clipPath')
    const id = randomString(this.__ids)
    const newGroup = this.__createElement('g')

    this.__applyCurrentDefaultPath()
    group.removeChild(this.__currentElement)
    clipPath.setAttribute('id', id)
    clipPath.appendChild(this.__currentElement)

    this.__defs.appendChild(clipPath)
    group.setAttribute('clip-path', format('url(#{id})', { id }))
    group.appendChild(newGroup)

    this.__currentElement = newGroup
  }

  setLineDash(dashArray: number[]) {
    if (dashArray && dashArray.length > 0) {
      this.lineDash = dashArray.join(',')
    } else {
      this.lineDash = null
    }
  }

  setTransform(
    a: number | DOMMatrix,
    b?: number,
    c?: number,
    d?: number,
    e?: number,
    f?: number,
  ) {
    if (a instanceof DOMMatrix) {
      this.__transformMatrix = new DOMMatrix([a.a, a.b, a.c, a.d, a.e, a.f])
    } else {
      this.__transformMatrix = new DOMMatrix([a, b!, c!, d!, e!, f!])
    }
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
    const matrix = this.getTransform().scale(x, y)
    this.setTransform(matrix)
  }

  rotate(angle: number) {
    const matrix = this.getTransform().multiply(
      new DOMMatrix([
        Math.cos(angle),
        Math.sin(angle),
        -Math.sin(angle),
        Math.cos(angle),
        0,
        0,
      ]),
    )
    this.setTransform(matrix)
  }

  translate(x: number, y: number) {
    const matrix = this.getTransform().translate(x, y)
    this.setTransform(matrix)
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number) {
    const matrix = this.getTransform().multiply(
      new DOMMatrix([a, b, c, d, e, f]),
    )
    this.setTransform(matrix)
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

  __getTransformRotation(): number {
    return Math.atan2(this.__transformMatrix.b, this.__transformMatrix.a)
  }

  // Stubs for unimplemented methods
  drawFocusRing() {}
  createImageData() {}
  putImageData() {}
  globalCompositeOperation() {}
  drawImage() {}
  createPattern() {
    return null
  }
}
