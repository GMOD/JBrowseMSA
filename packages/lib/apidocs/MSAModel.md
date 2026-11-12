---
id: msamodel
title: MSAModel
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/JBrowseMSA/blob/main/packages/lib/src/model/msaModel.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this
  model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Overview

### MSAModel - Properties

#### property: msaFormat

force the MSA data to be parsed as a specific format instead of relying on
auto-detection (which is ambiguous between e.g. fasta and a3m)

```js
msaFormat: types.maybe(
  types.enumeration < MSAFormat > ('MSAFormat', msaFormats),
)
```

#### property: residueColor

the residue mark's color object, `{channel, field, scale}`: which of the cell
and the letter the color paints, whether the cell reads its residue or the
feature covering it, and the scheme or the letter colors. See docs/layers.md

```js
residueColor: stripDefault(types.frozen<ResidueColor>(), {})
```

#### property: showColumnStats

show a tooltip with the hovered column's value for a track while hovering that
track: the conservation scores, the logo's composition, an arc's partner columns

```js
showColumnStats: stripDefault(types.boolean, true)
```

### MSAModel - Actions

#### action: setMSAFormat

force a specific MSA parser, or pass undefined to auto-detect

```js
setMSAFormat: (arg?: MSAFormat | undefined) => void
```

#### action: setResidueColor

replace the residue color; a member left out takes its default

```js
setResidueColor: (color: ResidueColor) => void
```

#### action: setShowColumnStats

```js
setShowColumnStats: (arg: boolean) => void
```
