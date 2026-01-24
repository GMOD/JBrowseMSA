---
id: tree
title: Tree
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree objects in
our source code.

### Source file

[src/model/treeModel.ts](https://github.com/GMOD/react-msaview/blob/main/lib/src/model/treeModel.ts)

### Tree - Properties

#### property: drawLabels

```js
// type signature
true
// code
drawLabels: true
```

#### property: drawNodeBubbles

draw clickable node bubbles on the tree

```js
// type signature
true
// code
drawNodeBubbles: true
```

#### property: drawTree

draw tree, boolean

```js
// type signature
true
// code
drawTree: true
```

#### property: labelsAlignRight

right-align the labels

```js
// type signature
false
// code
labelsAlignRight: false
```

#### property: showBranchLen

use "branch length" e.g. evolutionary distance to draw tree branch lengths. if
false, the layout is a "cladogram" that does not take into account evolutionary
distances

```js
// type signature
true
// code
showBranchLen: true
```

#### property: treeAreaWidth

width of the area the tree is drawn in, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
treeAreaWidth: types.optional(types.number, 400)
```

#### property: treeWidth

width of the tree within the treeArea, px

```js
// type signature
IOptionalIType<ISimpleType<number>, [undefined]>
// code
treeWidth: types.optional(types.number, 300)
```

### Tree - Getters

#### getter: treeWidthMatchesArea

synchronization that matches treeWidth to treeAreaWidth

```js
// type
true
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

#### action: setTreeWidthMatchesArea

synchronize the treewidth and treeareawidth

```js
// type signature
setTreeWidthMatchesArea: (arg: boolean) => void
```
