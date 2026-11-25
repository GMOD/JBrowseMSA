---
id: tree
title: Tree
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/JBrowseMSA/blob/main/packages/lib/src/model/treeModel.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this
  model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Overview

### Tree - Properties

#### property: drawLabels

```js
drawLabels: stripDefault(types.boolean, true)
```

#### property: drawNodeBubbles

draw node bubbles on the tree; the branches stay clickable either way

```js
drawNodeBubbles: stripDefault(types.boolean, true)
```

#### property: drawNodeLabels

draw the label a newick file gives an internal node, which is where a bootstrap
or posterior support value lands

```js
drawNodeLabels: stripDefault(types.boolean, false)
```

#### property: drawTree

draw tree, boolean

```js
drawTree: stripDefault(types.boolean, true)
```

#### property: labelsAlignRight

right-align the labels

```js
labelsAlignRight: stripDefault(
  types.boolean,
  defaults.labelsAlignRight ?? false,
)
```

#### property: overviewHeight

height of the tree overview band, px

```js
overviewHeight: stripDefault(types.number, 120)
```

#### property: showBranchLen

use "branch length" e.g. evolutionary distance to draw tree branch lengths. if
false, the layout is a "cladogram" that does not take into account evolutionary
distances

```js
showBranchLen: stripDefault(types.boolean, true)
```

#### property: showTreeOverview

draw the whole tree small above the tree panel, with the focused subtree boxed.
A click on it focuses the subtree under the pointer

```js
showTreeOverview: stripDefault(types.boolean, false)
```

#### property: treeAreaWidth

width of the area the tree and its labels draw in, px. Undefined fits the area
to the labels and the tree; `effectiveTreeAreaWidth` reads the width either way

```js
treeAreaWidth: types.maybe(types.number)
```

#### property: treeOrder

the order each node's children draw in: `branchLength` (shortest first), `input`
(as the file gives them), `ladderize` (fewest tips first) or `ladderizeReverse`
(most tips first)

```js
treeOrder: stripDefault(
  types.enumeration < TreeOrder > ('TreeOrder', [...treeOrders]),
  'branchLength',
)
```

#### property: treeWidth

width of the tree within the tree area, px. Undefined gives the tree the area
less the labels; `effectiveTreeWidth` reads the width either way

```js
treeWidth: types.maybe(types.number)
```

### Tree - Actions

#### action: setDrawLabels

```js
setDrawLabels: (arg: boolean) => void
```

#### action: setDrawNodeBubbles

```js
setDrawNodeBubbles: (arg: boolean) => void
```

#### action: setDrawNodeLabels

```js
setDrawNodeLabels: (arg: boolean) => void
```

#### action: setDrawTree

```js
setDrawTree: (arg: boolean) => void
```

#### action: setLabelsAlignRight

```js
setLabelsAlignRight: (arg: boolean) => void
```

#### action: setShowBranchLen

```js
setShowBranchLen: (arg: boolean) => void
```

#### action: setShowTreeOverview

```js
setShowTreeOverview: (arg: boolean) => void
```

#### action: setTreeAreaWidth

set the tree area width, px, or undefined to fit it to the labels and the tree.
The tree then fills the area less the labels

```js
setTreeAreaWidth: (n: number | undefined) => void
```

#### action: setTreeOrder

```js
setTreeOrder: (order: TreeOrder) => void
```

#### action: setTreeWidth

set the tree width, px, or undefined to fill the tree area less the labels

```js
setTreeWidth: (n: number | undefined) => void
```
