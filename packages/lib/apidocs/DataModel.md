---
id: datamodel
title: DataModel
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

### Source file

[src/model/DataModel.ts](https://github.com/GMOD/react-msaview/blob/main/lib/src/model/DataModel.ts)

the data stored for the model. this is sometimes temporary in the case that e.g.
msaFilehandle is available on the parent model, because then the msa data will
not be persisted in saved session snapshots, it will be fetched from
msaFilehandle at startup

### DataModel - Properties

#### property: msa

```js
// type signature
IMaybe<ISimpleType<string>>
// code
msa: types.maybe(types.string)
```

#### property: tree

```js
// type signature
IMaybe<ISimpleType<string>>
// code
tree: types.maybe(types.string)
```

#### property: treeMetadata

```js
// type signature
IMaybe<ISimpleType<string>>
// code
treeMetadata: types.maybe(types.string)
```

### DataModel - Actions

#### action: setMSA

```js
// type signature
setMSA: (msa?: string) => void
```

#### action: setTree

```js
// type signature
setTree: (tree?: string) => void
```

#### action: setTreeMetadata

```js
// type signature
setTreeMetadata: (treeMetadata?: string) => void
```
