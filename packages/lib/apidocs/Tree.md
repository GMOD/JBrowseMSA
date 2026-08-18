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

draw clickable node bubbles on the tree

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
drawNodeBubbles: stripDefault(types.boolean, defaultDrawNodeBubbles)
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

#### property: treeAreaWidth

width of the area the tree is drawn in, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
treeAreaWidth: stripDefault(types.number, defaultTreeAreaWidth)
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
