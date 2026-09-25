---
id: datamodel
title: DataModel
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/JBrowseMSA/blob/main/packages/lib/src/model/DataModel.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this
  model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Overview

the data stored for the model. this is sometimes temporary in the case that e.g.
msaFilehandle is available on the parent model, because then the msa data will
not be persisted in saved session snapshots, it will be fetched from
msaFilehandle at startup

### DataModel - Properties

#### property: gff

```js
gff: types.maybe(types.string)
```

#### property: msa

```js
msa: types.maybe(types.string)
```

#### property: tree

```js
tree: types.maybe(types.string)
```

#### property: treeMetadata

```js
treeMetadata: types.maybe(types.string)
```

### DataModel - Actions

#### action: setGFF

```js
setGFF: (gff?: string | undefined) => void
```

#### action: setMSA

```js
setMSA: (msa?: string | undefined) => void
```

#### action: setTree

```js
setTree: (tree?: string | undefined) => void
```

#### action: setTreeMetadata

```js
setTreeMetadata: (treeMetadata?: string | undefined) => void
```
