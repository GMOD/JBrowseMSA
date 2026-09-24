// @vitest-environment jsdom
import { parseNewick } from 'msa-parsers'
import { expect, test } from 'vitest'

import MSAModelF from './model.ts'

import type { TreeOrder, TreeRoot } from './types.ts'

function makeModel(
  tree: string,
  { treeOrder, treeRoot }: { treeOrder?: TreeOrder; treeRoot?: TreeRoot } = {},
) {
  const names = parseNewickTips(tree)
  return MSAModelF().create({
    type: 'MsaView',
    msaFormat: 'fasta',
    data: { msa: names.map(n => `>${n}\nMK`).join('\n'), tree },
    treeOrder: treeOrder ?? 'input',
    ...(treeRoot ? { treeRoot } : {}),
  })
}

function parseNewickTips(tree: string) {
  const tips: string[] = []
  const stack = [parseNewick(tree)]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.children?.length) {
      stack.push(...node.children)
    } else {
      tips.push(node.name!)
    }
  }
  return tips
}

test('writes the tree back as the file gave it', () => {
  const tree = '((A:1,B:2)95:0.5,C:3);'
  expect(makeModel(tree).treeNewick).toBe(tree)
})

test('leaves unnamed internal nodes unnamed', () => {
  expect(makeModel('((A,B),C);').treeNewick).toBe('((A,B),C);')
})

test('quotes a name the grammar would split', () => {
  const tree = "('A,x':1,'it''s B':1,'C (y)':1);"
  const model = makeModel(tree)
  expect(model.rowNames).toEqual(['A,x', "it's B", 'C (y)'])
  expect(model.treeNewick).toBe(tree)
})

test('writes the order, rotations and root on screen, collapsed clades included', () => {
  const model = makeModel('((A:1,B:1):3,(C:1,(D:1,E:5):1):1);', {
    treeRoot: 'midpoint',
  })
  const de = model.root.children![0]!
  model.toggleRotated(de.data.id)
  model.toggleCollapsed(model.root.children![1]!.data.id)
  expect(model.treeNewick).toBe('((E:5,D:1):0.5,(C:1,(A:1,B:1):4):0.5);')
})

test('writes a caterpillar of 20000 tips', () => {
  let newick = 'T0:1'
  for (let i = 1; i < 20000; i++) {
    newick = `(${newick},T${i}:1):1`
  }
  const model = makeModel(`${newick};`)
  expect(model.treeNewick).toBe(`${newick};`)
})
