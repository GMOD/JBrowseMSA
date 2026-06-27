---
id: tree
title: Tree
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/react-msaview/blob/main/packages/lib/src/model/treeModel.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Overview

### Tree - Properties

#### property: drawLabels

```js
// type signature
true
// code
drawLabels: defaultDrawLabels
```

#### property: drawNodeBubbles

draw clickable node bubbles on the tree

```js
// type signature
true
// code
drawNodeBubbles: defaultDrawNodeBubbles
```

#### property: drawTree

draw tree, boolean

```js
// type signature
true
// code
drawTree: defaultDrawTree
```

#### property: labelsAlignRight

right-align the labels

```js
// type signature
false
// code
labelsAlignRight: defaultLabelsAlignRight
```

#### property: showBranchLen

use "branch length" e.g. evolutionary distance to draw tree branch
lengths. if false, the layout is a "cladogram" that does not take into
account evolutionary distances

```js
// type signature
true
// code
showBranchLen: defaultShowBranchLen
```

#### property: treeAreaWidth

width of the area the tree is drawn in, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
treeAreaWidth: types.optional(types.number, defaultTreeAreaWidth)
```

#### property: treeWidth

width of the tree within the treeArea, px. automatically synced to
fit within treeAreaWidth

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
treeWidth: types.optional(types.number, defaultTreeWidth)
```

### Tree - Actions

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

#### action: setShowBranchLen

```js
// type signature
setShowBranchLen: (arg: boolean) => void
```

#### action: setTreeAreaWidth

set tree area width (px)

```js
// type signature
setTreeAreaWidth: (n: number) => void
```

#### action: setTreeWidth

set tree width (px)

```js
// type signature
setTreeWidth: (n: number) => void
```
