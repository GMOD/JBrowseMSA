/**
 * Callout overlay for the screenshot specs: the red arrows / boxes / labels a
 * hand-made teaching figure uses, drawn as an SVG over the page just before
 * capture so they composite into the PNG with no external image editor.
 *
 * Ported from jbrowse-components' packages/browser-test-utils/annotationOverlay
 * (same colors, arrow geometry and pill styling, so figures from the two repos
 * read as one set), trimmed to what these figures need and with one anchor kind
 * this repo has and that one doesn't: an ALIGNMENT COLUMN.
 *
 * ANCHOR, DON'T MEASURE. A callout pointing at "the PYD block" wants to track
 * the PYD block. Written as a raw pixel it is correct only for the viewport
 * width, colWidth and scroll position it was measured against, and nothing tells
 * you when one of those changes — the figure just quietly develops an arrow
 * pointing at the wrong domain. Three anchor kinds resolve at capture time:
 *
 *   col/row  MODEL anchoring. Reads window.MSAVIEW_MODEL (published by
 *            packages/app/src/App.tsx) for colWidth/rowHeight/scrollX/scrollY
 *            and the [data-testid="msa_canvas"] viewport rect, which is the
 *            same origin MSACanvasBlock positions its blocks against. Prefer
 *            this for anything pointing at the alignment.
 *   selector  the first matching element.
 *   text      the smallest-area element whose visible text matches — for menu
 *             items and buttons with no testid.
 *
 * drawAnnotationOverlay runs in PAGE CONTEXT (puppeteer serializes it to
 * source), so it takes no imports and closes over nothing; it returns the
 * anchors that resolved to nothing, which the caller turns into a thrown error
 * rather than shipping a figure with a callout parked at the origin.
 */

export const ANNOTATION_OVERLAY_ID = '__msa_annotation_overlay'

export function drawAnnotationOverlay(items, overlayId) {
  const NS = 'http://www.w3.org/2000/svg'
  const DEFAULT_COLOR = '#e3242b'
  const unresolved = []

  const svg = document.createElementNS(NS, 'svg')
  svg.id = overlayId
  svg.setAttribute(
    'style',
    'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none',
  )
  // attached before anything is drawn into it: getComputedTextLength (used to
  // size the label pills) returns 0 on a detached SVG, which silently collapses
  // every pill to a 20px stub instead of failing
  document.body.append(svg)
  const defs = document.createElementNS(NS, 'defs')
  svg.append(defs)
  const markers = new Set()

  function arrowMarker(color) {
    const id = `msa-arrow-${color.replace(/[^a-z0-9]/gi, '')}`
    if (!markers.has(id)) {
      markers.add(id)
      const marker = document.createElementNS(NS, 'marker')
      marker.setAttribute('id', id)
      marker.setAttribute('viewBox', '0 0 10 10')
      marker.setAttribute('refX', '9')
      marker.setAttribute('refY', '5')
      marker.setAttribute('markerWidth', '5')
      marker.setAttribute('markerHeight', '5')
      marker.setAttribute('orient', 'auto-start-reverse')
      const path = document.createElementNS(NS, 'path')
      path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z')
      path.setAttribute('fill', color)
      marker.append(path)
      defs.append(marker)
    }
    return id
  }

  // The MSA viewport rect plus the model geometry, read once. Absent when a
  // spec annotates a page with no alignment loaded (the import form), which is
  // why every col/row anchor reports itself unresolved rather than throwing.
  function msaFrame() {
    const el = document.querySelector('[data-testid="msa_canvas"]')
    const model = window.MSAVIEW_MODEL
    return el && model ? { rect: el.getBoundingClientRect(), model } : undefined
  }

  // An alignment column span (and optionally a row span, named by row LABEL) ->
  // viewport rect.
  //
  // Columns use the same arithmetic MSACanvasBlock uses to place a block
  // (left: scrollX + offsetX). Rows are named by label and resolved through
  // model.leaves, because the rendered row order is the TREE's, not the input
  // file's — writing a row index in a spec would encode a topology that
  // re-running the aligner can legitimately change. The band of a leaf is
  // [node.x - rowHeight/2, +rowHeight] in container space, which is what
  // renderMSABlock draws to (tileY = node.x - rowHeight, under a
  // translate(0, rowHeight/2)).
  function resolveColRow(anchor) {
    const frame = msaFrame()
    if (!frame) {
      return undefined
    }
    const { rect, model } = frame
    const { colWidth, rowHeight, scrollX, scrollY } = model
    const col = anchor.col ?? 0
    const colEnd = anchor.colEnd ?? col
    const left = rect.left + col * colWidth + scrollX
    const width = (colEnd - col + 1) * colWidth

    // Rows default to the full extent of the DRAWN ROWS, not the viewport: the
    // MSA panel is as tall as `height` says, so a 12-row alignment in a 430px
    // panel leaves whitespace below, and defaulting to the container would put
    // a `alignY: 'bottom'` label off the bottom of the frame and draw a box
    // around a lot of nothing.
    const leaves = model.leaves
    const first =
      anchor.rowLabel === undefined
        ? leaves[0]
        : leaves.find(l => l.data.name === anchor.rowLabel)
    const last =
      anchor.rowLabelEnd === undefined
        ? anchor.rowLabel === undefined
          ? leaves[leaves.length - 1]
          : first
        : leaves.find(l => l.data.name === anchor.rowLabelEnd)
    if (!first || !last) {
      return undefined
    }
    const bandTop = Math.min(first.x, last.x) - rowHeight / 2
    const bandBottom = Math.max(first.x, last.x) + rowHeight / 2
    return {
      left,
      top: rect.top + scrollY + bandTop,
      width,
      height: bandBottom - bandTop,
    }
  }

  function resolveText(needle) {
    let best
    for (const el of document.querySelectorAll('body *')) {
      if (el.textContent?.trim() === needle) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          const area = r.width * r.height
          if (!best || area < best.area) {
            best = { area, rect: r }
          }
        }
      }
    }
    return best?.rect
  }

  function resolve(anchor) {
    if (!anchor) {
      return undefined
    }
    if (anchor.col !== undefined || anchor.rowLabel !== undefined) {
      return resolveColRow(anchor)
    }
    if (anchor.selector) {
      return document.querySelector(anchor.selector)?.getBoundingClientRect()
    }
    if (anchor.text) {
      return resolveText(anchor.text)
    }
    return undefined
  }

  // Resolved rect -> the point a callout attaches to, before dx/dy.
  function pointOf(rect, anchor) {
    const alignX = anchor.alignX ?? 'center'
    const alignY = anchor.alignY ?? 'center'
    const x =
      alignX === 'left'
        ? rect.left
        : alignX === 'right'
          ? rect.left + rect.width
          : rect.left + rect.width / 2
    const y =
      alignY === 'top'
        ? rect.top
        : alignY === 'bottom'
          ? rect.top + rect.height
          : rect.top + rect.height / 2
    return { x: x + (anchor.dx ?? 0), y: y + (anchor.dy ?? 0) }
  }

  for (const a of items) {
    const color = a.color ?? DEFAULT_COLOR
    let rect
    let point
    if (a.anchor) {
      rect = resolve(a.anchor)
      if (!rect) {
        unresolved.push(JSON.stringify(a.anchor))
        continue
      }
      point = pointOf(rect, a.anchor)
    }
    const x = (point?.x ?? a.x ?? 0) + (a.dx ?? 0)
    const y = (point?.y ?? a.y ?? 0) + (a.dy ?? 0)

    if (a.type === 'arrow') {
      let tail
      if (a.fromAnchor) {
        const fromRect = resolve(a.fromAnchor)
        if (!fromRect) {
          unresolved.push(JSON.stringify(a.fromAnchor))
          continue
        }
        tail = pointOf(fromRect, a.fromAnchor)
      } else {
        tail = a.from
      }
      const strokeWidth = a.strokeWidth ?? 4
      const line = document.createElementNS(NS, 'line')
      line.setAttribute('x1', String(tail.x))
      line.setAttribute('y1', String(tail.y))
      line.setAttribute('x2', String(x))
      line.setAttribute('y2', String(y))
      line.setAttribute('stroke', color)
      line.setAttribute('stroke-width', String(strokeWidth))
      line.setAttribute('marker-end', `url(#${arrowMarker(color)})`)
      svg.append(line)
    } else if (a.type === 'box') {
      const pad = a.pad ?? 6
      const r = document.createElementNS(NS, 'rect')
      r.setAttribute('x', String((rect ? rect.left : a.x) - pad))
      r.setAttribute('y', String((rect ? rect.top : a.y) - pad))
      r.setAttribute('width', String((rect ? rect.width : a.width) + pad * 2))
      r.setAttribute(
        'height',
        String((rect ? rect.height : a.height) + pad * 2),
      )
      r.setAttribute('rx', '6')
      r.setAttribute('fill', a.fillOpacity ? color : 'none')
      if (a.fillOpacity) {
        r.setAttribute('fill-opacity', String(a.fillOpacity))
      }
      r.setAttribute('stroke', color)
      r.setAttribute('stroke-width', String(a.strokeWidth ?? 5))
      svg.append(r)
    } else if (a.type === 'text') {
      // Always a white rounded pill with a colored border and black text, so a
      // label reads the same over a pale gap as over a saturated domain block.
      const fontSize = Math.max(a.fontSize ?? 22, 13)
      const fontFamily = 'system-ui, sans-serif'
      const maxWidth = a.maxWidth ?? 420
      const measure = document.createElementNS(NS, 'text')
      measure.setAttribute('font-family', fontFamily)
      measure.setAttribute('font-size', String(fontSize))
      measure.setAttribute('visibility', 'hidden')
      svg.append(measure)
      const widthOf = s => {
        measure.textContent = s
        return measure.getComputedTextLength()
      }
      const lines = []
      for (const paragraph of (a.text ?? '').split('\n')) {
        let line = ''
        for (const word of paragraph.split(' ')) {
          const next = line ? `${line} ${word}` : word
          if (line && widthOf(next) > maxWidth) {
            lines.push(line)
            line = word
          } else {
            line = next
          }
        }
        lines.push(line)
      }
      const textWidth = Math.max(...lines.map(widthOf))
      measure.remove()

      const lineHeight = fontSize * 1.25
      const padX = 10
      const padY = 6
      const boxW = textWidth + padX * 2
      const boxH = lines.length * lineHeight + padY * 2
      const boxX = a.textAlign === 'end' ? x - boxW : x
      const pill = document.createElementNS(NS, 'rect')
      pill.setAttribute('x', String(boxX))
      pill.setAttribute('y', String(y - boxH / 2))
      pill.setAttribute('width', String(boxW))
      pill.setAttribute('height', String(boxH))
      pill.setAttribute('rx', '6')
      pill.setAttribute('fill', '#fff')
      pill.setAttribute('stroke', color)
      pill.setAttribute('stroke-width', '3')
      svg.append(pill)

      const text = document.createElementNS(NS, 'text')
      text.setAttribute('fill', '#000')
      text.setAttribute('font-family', fontFamily)
      text.setAttribute('font-size', String(fontSize))
      text.setAttribute('x', String(boxX + padX))
      text.setAttribute('y', String(y - boxH / 2 + padY + fontSize * 0.85))
      for (const [i, line] of lines.entries()) {
        const tspan = document.createElementNS(NS, 'tspan')
        tspan.setAttribute('x', String(boxX + padX))
        if (i > 0) {
          tspan.setAttribute('dy', String(lineHeight))
        }
        tspan.textContent = line
        text.append(tspan)
      }
      svg.append(text)
    }
  }

  return unresolved
}

// Draw a spec's callouts, and fail the capture if any anchor found nothing —
// an unresolved anchor means the thing the figure is about moved or went away,
// which is exactly when a stale figure would otherwise ship.
export async function applyAnnotations(page, annotations, specName) {
  if (!annotations?.length) {
    return
  }
  const unresolved = await page.evaluate(
    drawAnnotationOverlay,
    annotations,
    ANNOTATION_OVERLAY_ID,
  )
  if (unresolved.length > 0) {
    throw new Error(
      `${specName}: ${unresolved.length} annotation anchor(s) resolved to nothing: ${unresolved.join('; ')}`,
    )
  }
}
