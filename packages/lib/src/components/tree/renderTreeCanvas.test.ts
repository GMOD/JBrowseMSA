import { describe, expect, it } from 'vitest'

import { calcDepthToLeaf, findMaxBranchLen } from '../../hierarchy.ts'
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

describe('findMaxBranchLen', () => {
  it('uses the node itself when it is a leaf', () => {
    expect(findMaxBranchLen(leaf('a', 1.5))).toBe(1.5)
  })

  it('takes the max across descendants', () => {
    expect(
      findMaxBranchLen(internal('p', [leaf('a', 0.5), leaf('b', 1.5)], 0.3)),
    ).toBe(1.5)
  })

  it('treats a missing len as 0', () => {
    expect(findMaxBranchLen(leaf('a'))).toBe(0)
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
    theme: { palette: { text: { primary: '#000' } } } as Theme,
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
      theme: { palette: { text: { primary: '#000' } } } as Theme,
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
