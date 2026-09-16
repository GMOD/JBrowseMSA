import { describe, expect, it } from 'vitest'

import { calcDepthToLeaf, links } from '../../hierarchy.ts'
import stateModelFactory from '../../model.ts'
import { ClickMapIndex } from './clickMap.ts'
import { getNodeX, renderTreeCanvas } from './renderTreeCanvas.ts'

import type { HierarchyNode } from '../../hierarchy.ts'
import type { RenderCtx } from '../renderCtx.ts'
import type { Theme } from '@mui/material'

function leaf(id: string, len?: number): HierarchyNode {
  return {
    data: { id, name: id, children: [] },
    children: null,
    parent: null,
    depth: 0,
    height: 0,
    len,
  }
}

function internal(
  id: string,
  children: HierarchyNode[],
  len?: number,
): HierarchyNode {
  const node: HierarchyNode = {
    data: { id, name: id, children: children.map(c => c.data) },
    children,
    parent: null,
    depth: 0,
    height: 1,
    len,
  }
  for (const child of children) {
    child.parent = node
  }
  return node
}

describe('calcDepthToLeaf', () => {
  it('is 0 for a leaf', () => {
    expect(calcDepthToLeaf(leaf('a'))).toBe(0)
  })

  it('counts steps to the deepest tip', () => {
    const tips = [leaf('a'), leaf('b')]
    const intermediate = internal('int', tips)
    const root = internal('root', [intermediate])

    expect(calcDepthToLeaf(tips[0]!)).toBe(0)
    expect(calcDepthToLeaf(intermediate)).toBe(1)
    expect(calcDepthToLeaf(root)).toBe(2)
  })

  it('memoizes without re-walking the subtree', () => {
    // the renderer asks for every node's depth on every pass, so the memo has to
    // short-circuit the traversal itself, not just the arithmetic. A sentinel
    // planted on an already-computed child must survive a second root call.
    const child = leaf('a')
    const root = internal('root', [child])
    expect(calcDepthToLeaf(root)).toBe(1)

    child.depthToLeaf = 99
    expect(calcDepthToLeaf(root)).toBe(1)
    expect(child.depthToLeaf).toBe(99)
  })
})

describe('getNodeX cladogram positioning', () => {
  it('aligns every tip at the rightmost x', () => {
    const tips = [leaf('a'), leaf('b')]
    calcDepthToLeaf(internal('root', tips))

    const xs = tips.map(tip => getNodeX(tip, false, 100, 1))
    expect(xs).toEqual([100, 100])
  })

  it('puts the root at the leftmost x and internal nodes in between', () => {
    const tips = [leaf('a'), leaf('b')]
    const intermediate = internal('int', tips)
    const root = internal('root', [intermediate])
    calcDepthToLeaf(root)

    const xRoot = getNodeX(root, false, 100, 2)!
    const xInt = getNodeX(intermediate, false, 100, 2)!
    const xTip = getNodeX(tips[0]!, false, 100, 2)!

    expect(xRoot).toBe(0)
    expect(xInt).toBeGreaterThan(xRoot)
    expect(xTip).toBeGreaterThan(xInt)
    expect(xTip).toBe(100)
  })

  it('collapses to the root x when there is no topological depth', () => {
    expect(getNodeX(leaf('a'), false, 100, 0)).toBe(0)
  })

  it('uses branch length in phylogram mode', () => {
    expect(getNodeX(leaf('a', 2.5), true, 100, 1)).toBe(2.5)
  })
})

// the x values the tree pass actually strokes, for a model built from newick,
// alongside the tree width they are expected to span
function drawnTree(newick: string) {
  const model = stateModelFactory().create({
    type: 'MsaView',
    data: { msa: '>a\nA\n>b\nA\n>c\nA\n>d\nA', tree: newick },
  })
  model.setWidth(1000)
  // labels would need a canvas to measure; the branch geometry is the subject
  model.setDrawLabels(false)
  model.setDrawNodeBubbles(false)

  const xs: number[] = []
  const ctx = {
    font: '12px sans-serif',
    beginPath() {},
    stroke() {},
    resetTransform() {},
    scale() {},
    translate() {},
    moveTo(x: number) {
      xs.push(x)
    },
    lineTo(x: number) {
      xs.push(x)
    },
  } as unknown as RenderCtx

  renderTreeCanvas({
    model,
    ctx,
    offsetY: 0,
    theme: {
      palette: { text: { primary: '#000' }, background: { default: '#fff' } },
    } as Theme,
  })
  return { xs, model }
}

describe('renderTreeCanvas horizontal extent', () => {
  it('spreads a cladogram across the tree area when branch lengths are absent', () => {
    // a lengthless newick forces cladogram mode; scaling it by the (zero) max
    // branch length would stack every node on x=0 as one vertical line
    const { xs, model } = drawnTree('((a,b),(c,d));')
    expect(Math.max(...xs)).toBe(model.treeWidth)
  })

  it('scales a phylogram by branch length', () => {
    const { xs, model } = drawnTree('((a:0.1,b:0.2):0.3,(c:0.4,d:0.5):0.6);')
    expect(Math.max(...xs)).toBeCloseTo(model.treeWidth)
  })

  // labels off means no label gutter to reserve, so the tips reach the far edge
  // of the tree area rather than stopping at the default treeWidth
  it('hands the label gutter to the tree when labels are off', () => {
    const { model } = drawnTree('((a,b),(c,d));')
    expect(model.treeWidth).toBe(model.treeAreaWidth - 10 - model.marginLeft)
  })
})

describe('node bubble click targets', () => {
  const bounds = { minX: 0, minY: 0, maxX: 10000, maxY: 10000 }

  // "draw clickable bubbles" only controls the painting; the branches have to
  // stay clickable with it off
  function renderWithBubbles(drawNodeBubbles: boolean) {
    const model = stateModelFactory().create({
      type: 'MsaView',
      data: { msa: '>a\nA\n>b\nA\n>c\nA\n>d\nA', tree: '((a,b),(c,d));' },
    })
    model.setWidth(1000)
    model.setDrawLabels(false)
    model.setDrawNodeBubbles(drawNodeBubbles)

    let arcs = 0
    const ctx = {
      font: '12px sans-serif',
      beginPath() {},
      stroke() {},
      fill() {},
      resetTransform() {},
      scale() {},
      translate() {},
      moveTo() {},
      lineTo() {},
      arc() {
        arcs++
      },
    } as unknown as RenderCtx

    const clickMap = new ClickMapIndex()
    renderTreeCanvas({
      model,
      ctx,
      clickMap,
      offsetY: 0,
      theme: {
        palette: { text: { primary: '#000' }, background: { default: '#fff' } },
      } as Theme,
    })
    return { arcs, hits: clickMap.search(bounds) }
  }

  it('indexes the internal nodes when the bubbles are drawn', () => {
    const { arcs, hits } = renderWithBubbles(true)
    expect(arcs).toBe(3)
    expect(hits.filter(h => h.branch).length).toBe(3)
  })

  it('indexes them just the same when the bubbles are off', () => {
    const { arcs, hits } = renderWithBubbles(false)
    expect(arcs).toBe(0)
    expect(hits.filter(h => h.branch).length).toBe(3)
  })
})

describe('leaf label click targets', () => {
  const bounds = { minX: 0, minY: 0, maxX: 10000, maxY: 10000 }
  // the recorded fillText x is in content coordinates -- the fake ctx applies
  // the same translate the real one does -- so it is directly comparable to the
  // clickMap box, which is what the hit test searches
  function renderLabels(labelsAlignRight: boolean) {
    const model = stateModelFactory().create({
      type: 'MsaView',
      data: { msa: '>a\nA\n>b\nA', tree: '(a,b);' },
    })
    model.setWidth(1000)
    model.setDrawTree(false)
    model.setLabelsAlignRight(labelsAlignRight)

    let tx = 0
    const drawn: number[] = []
    const ctx = {
      font: '12px sans-serif',
      measureText: (text: string) => ({ width: text.length * 6 }),
      beginPath() {},
      stroke() {},
      setLineDash() {},
      resetTransform() {
        tx = 0
      },
      scale() {},
      translate(x: number) {
        tx += x
      },
      moveTo() {},
      lineTo() {},
      fillText(_text: string, x: number) {
        drawn.push(x + tx)
      },
    } as unknown as RenderCtx

    const clickMap = new ClickMapIndex()
    renderTreeCanvas({
      model,
      ctx,
      clickMap,
      offsetY: 0,
      theme: {
        palette: { text: { primary: '#000' }, background: { default: '#fff' } },
      } as Theme,
    })
    return { drawn, hits: clickMap.search(bounds).filter(h => !h.branch) }
  }

  it('boxes a right-aligned label at the edge it is drawn against', () => {
    const { drawn, hits } = renderLabels(true)
    expect(hits.length).toBe(drawn.length)
    // textAlign is 'right' here, so the drawn x is the label's right edge
    for (const hit of hits) {
      expect(drawn).toContain(hit.maxX)
    }
  })

  it('boxes a left-aligned label at the edge it is drawn from', () => {
    const { drawn, hits } = renderLabels(false)
    expect(hits.length).toBe(drawn.length)
    for (const hit of hits) {
      expect(drawn).toContain(hit.minX)
    }
  })
})

describe('block edge padding', () => {
  // A highlight label is 17px tall and a collapsed triangle reaches 0.42 rows
  // each way, so a row just outside a block still draws into it. The cull used
  // to pad by 5px and clip them at every block boundary.
  it('draws a highlight label for a row just above the block', () => {
    const model = stateModelFactory().create({
      type: 'MsaView',
      data: { msa: '>a\nA\n>b\nA\n>c\nA\n>d\nA\n>e\nA', tree: '(a,b,c,d,e);' },
      highlights: [{ rows: ['d'], label: 'clade' }],
    })
    model.setWidth(1000)
    model.setRowHeight(30)

    const drawn: string[] = []
    const ctx = {
      font: '12px sans-serif',
      measureText: (text: string) => ({ width: text.length * 6 }),
      beginPath() {},
      stroke() {},
      fill() {},
      arc() {},
      setLineDash() {},
      fillRect() {},
      resetTransform() {},
      scale() {},
      translate() {},
      moveTo() {},
      lineTo() {},
      fillText(text: string) {
        drawn.push(text)
      },
    } as unknown as RenderCtx

    // row 'd' starts at y=90, ten pixels above a block that starts at 100
    renderTreeCanvas({
      model,
      ctx,
      offsetY: 100,
      blockSizeYOverride: 100,
      theme: {
        palette: {
          text: { primary: '#000' },
          background: { paper: '#fff' },
        },
      } as Theme,
    })
    expect(drawn).toContain('clade')
  })
})

describe('block culling', () => {
  // The renderer skips whole subtrees that miss the block, which is what keeps a
  // 200k-tip tree at a few dozen nodes per draw. It has to skip exactly the
  // links that do not reach the block and no others -- a branch crossing it
  // belongs to a subtree that starts above and ends below.
  function linksDrawn(offsetY: number, by: number) {
    const model = stateModelFactory().create({
      type: 'MsaView',
      data: { tree: '(((a,b),(c,d)),((e,f),(g,h)));' },
    })
    model.setWidth(1000)
    model.setRowHeight(30)
    model.setDrawLabels(false)
    model.setDrawNodeBubbles(false)

    let moves = 0
    const ctx = {
      font: '12px sans-serif',
      measureText: (t: string) => ({ width: t.length * 6 }),
      beginPath() {},
      stroke() {},
      fill() {},
      arc() {},
      setLineDash() {},
      fillRect() {},
      fillText() {},
      resetTransform() {},
      scale() {},
      translate() {},
      moveTo() {
        moves++
      },
      lineTo() {},
    } as unknown as RenderCtx

    renderTreeCanvas({
      model,
      ctx,
      offsetY,
      blockSizeYOverride: by,
      theme: {
        palette: { text: { primary: '#000' }, background: { default: '#fff' } },
      } as Theme,
    })

    const expected = links(model.hierarchy).filter(({ source, target }) => {
      const y1 = Math.min(source.x!, target.x!)
      const y2 = Math.max(source.x!, target.x!)
      return offsetY + by >= y1 && y2 >= offsetY
    }).length
    return { moves, expected }
  }

  it('draws every link that reaches a middle block, and no others', () => {
    const { moves, expected } = linksDrawn(120, 30)
    expect(expected).toBeGreaterThan(0)
    expect(moves).toBe(expected)
  })

  it('draws every link that reaches the first block', () => {
    const { moves, expected } = linksDrawn(0, 30)
    expect(moves).toBe(expected)
  })
})

describe('internal node labels', () => {
  function drawnLabels(newick: string, drawNodeLabels: boolean) {
    const model = stateModelFactory().create({
      type: 'MsaView',
      data: { msa: '>a\nA\n>b\nA\n>c\nA\n>d\nA', tree: newick },
    })
    model.setWidth(1000)
    model.setDrawLabels(false)
    model.setDrawNodeLabels(drawNodeLabels)

    const drawn: string[] = []
    const ctx = {
      font: '12px sans-serif',
      beginPath() {},
      stroke() {},
      fill() {},
      arc() {},
      resetTransform() {},
      scale() {},
      translate() {},
      moveTo() {},
      lineTo() {},
      fillText(text: string) {
        drawn.push(text)
      },
    } as unknown as RenderCtx

    renderTreeCanvas({
      model,
      ctx,
      offsetY: 0,
      theme: {
        palette: { text: { primary: '#000' }, background: { default: '#fff' } },
      } as Theme,
    })
    return drawn
  }

  it('draws the support value newick puts after each internal paren', () => {
    expect(drawnLabels('((a,b)95,(c,d)80);', true).sort()).toEqual(['80', '95'])
  })

  it('draws none of them when the toggle is off', () => {
    expect(drawnLabels('((a,b)95,(c,d)80);', false)).toEqual([])
  })

  // withId names an unnamed node after its path, so an ungated pass would print
  // node-0-1-1 across the tree
  it('leaves an unlabelled internal node alone', () => {
    expect(drawnLabels('((a,b),(c,d));', true)).toEqual([])
  })
})
