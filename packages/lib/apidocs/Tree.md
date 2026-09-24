---
id: tree
title: Tree
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/react-msaview/blob/main/packages/lib/src/model/treeModel.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this
  model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Overview

### Tree - Properties

#### property: autoTreeAreaWidth

auto-size treeAreaWidth to fit the row labels (plus the tree, if drawn) instead
of using a fixed width. useful when there is no tree, so the label gutter isn't
padded out to the default 400px

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
autoTreeAreaWidth: stripDefault(types.boolean, false)
```

#### property: drawLabels

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
drawLabels: stripDefault(types.boolean, defaultDrawLabels)
```

#### property: drawNodeBubbles

draw node bubbles on the tree; the branches stay clickable either way

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
drawNodeBubbles: stripDefault(types.boolean, defaultDrawNodeBubbles)
```

#### property: drawNodeLabels

draw the label a newick file gives an internal node, which is where a bootstrap
or posterior support value lands

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
drawNodeLabels: stripDefault(types.boolean, defaultDrawNodeLabels)
```

#### property: drawTree

draw tree, boolean

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
drawTree: stripDefault(types.boolean, defaultDrawTree)
```

#### property: labelsAlignRight

right-align the labels

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
labelsAlignRight: stripDefault(types.boolean, defaultLabelsAlignRight)
```

#### property: overviewHeight

height of the tree overview band, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
overviewHeight: stripDefault(types.number, defaultOverviewHeight)
```

#### property: showBranchLen

use "branch length" e.g. evolutionary distance to draw tree branch lengths. if
false, the layout is a "cladogram" that does not take into account evolutionary
distances

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
showBranchLen: stripDefault(types.boolean, defaultShowBranchLen)
```

#### property: showTreeOverview

draw the whole tree small above the tree panel, with the focused subtree boxed.
A click on it focuses the subtree under the pointer

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
showTreeOverview: stripDefault(types.boolean, defaultShowTreeOverview)
```

#### property: treeAreaWidth

width of the area the tree is drawn in, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
treeAreaWidth: stripDefault(types.number, defaultTreeAreaWidth)
```

#### property: treeOrder

the order each node's children draw in: `branchLength` (shortest first), `input`
(as the file gives them), `ladderize` (fewest tips first) or `ladderizeReverse`
(most tips first)

```js
// type signature
IOptionalIType<ISimpleType<TreeOrder>, [undefined]>
// code
treeOrder: stripDefault(
        types.enumeration<TreeOrder>('TreeOrder', [...treeOrders]),
        defaultTreeOrder,
      )
```

#### property: treeWidth

width of the tree within the treeArea, px. automatically synced to fit within
treeAreaWidth

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
treeWidth: stripDefault(types.number, defaultTreeWidth)
```

### Tree - Actions

#### action: setAutoTreeAreaWidth

```js
// type signature
setAutoTreeAreaWidth: (arg: boolean) => void
```

#### action: setDrawLabels

```js
// type signature
setDrawLabels: (arg: boolean) => void
```

#### action: setDrawNodeBubbles

```js
// type signature
setDrawNodeBubbles: (arg: boolean) => void
```

#### action: setDrawNodeLabels

```js
// type signature
setDrawNodeLabels: (arg: boolean) => void
```

#### action: setDrawTree

```js
// type signature
setDrawTree: (arg: boolean) => void
```

#### action: setLabelsAlignRight

```js
// type signature
setLabelsAlignRight: (arg: boolean) => void
```

#### action: setOverviewHeight

set the height of the tree overview band (px)

```js
// type signature
setOverviewHeight: (n: number) => void
```

#### action: setShowBranchLen

```js
// type signature
setShowBranchLen: (arg: boolean) => void
```

#### action: setShowTreeOverview

```js
// type signature
setShowTreeOverview: (arg: boolean) => void
```

#### action: setTreeAreaWidth

set tree area width (px)

```js
// type signature
setTreeAreaWidth: (n: number) => void
```

#### action: setTreeOrder

```js
// type signature
setTreeOrder: (order: TreeOrder) => void
```

#### action: setTreeWidth

set tree width (px)

```js
// type signature
setTreeWidth: (n: number) => void
```
