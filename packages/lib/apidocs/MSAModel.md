---
id: msamodel
title: MSAModel
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/react-msaview/blob/main/packages/lib/src/model/msaModel.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Overview

### MSAModel - Properties

#### property: bgColor

draw MSA tiles with a background color

```js
// type signature
true
// code
bgColor: defaultBgColor
```

#### property: colorSchemeName

default color scheme name

```js
// type signature
string
// code
colorSchemeName: defaultColorSchemeName
```

#### property: msaFormat

force the MSA data to be parsed as a specific format instead of relying
on auto-detection (which is ambiguous between e.g. fasta and a3m)

```js
// type signature
IMaybe<ISimpleType<MSAFormat>>
// code
msaFormat: types.maybe(
        types.enumeration<MSAFormat>('MSAFormat', msaFormats),
      )
```

### MSAModel - Actions

#### action: setBgColor

```js
// type signature
setBgColor: (arg: boolean) => void
```

#### action: setColorSchemeName

set color scheme name

```js
// type signature
setColorSchemeName: (name: string) => void
```

#### action: setMSAFormat

force a specific MSA parser, or pass undefined to auto-detect

```js
// type signature
setMSAFormat: (arg?: MSAFormat | undefined) => void
```
