---
id: msamodel
title: MSAModel
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/react-msaview/blob/main/packages/lib/src/model/msaModel.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this
  model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Overview

### MSAModel - Properties

#### property: bgColor

draw MSA tiles with a background color

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
bgColor: stripDefault(types.boolean, defaultBgColor)
```

#### property: colorSchemeName

default color scheme name

```js
// type signature
IOptionalIType<ISimpleType<string>, [undefined]>
// code
colorSchemeName: stripDefault(types.string, defaultColorSchemeName)
```

#### property: customColorScheme

a color per residue letter, which replaces the `colorSchemeName` table while
set. A letter the map leaves out takes no color

```js
// type signature
IType<Record<string, string> | undefined, Record<string, string> | undefined, Record<string, string> | undefined>
// code
customColorScheme: types.frozen<Record<string, string> | undefined>()
```

#### property: msaFormat

force the MSA data to be parsed as a specific format instead of relying on
auto-detection (which is ambiguous between e.g. fasta and a3m)

```js
// type signature
IMaybe<ISimpleType<MSAFormat>>
// code
msaFormat: types.maybe(
        types.enumeration<MSAFormat>('MSAFormat', msaFormats),
      )
```

#### property: showColumnStats

show a tooltip with the hovered column's value for a track while hovering that
track: the conservation scores, the logo's composition, an arc's partner columns

```js
// type signature
IOptionalIType<ISimpleType<boolean>, [undefined]>
// code
showColumnStats: stripDefault(types.boolean, defaultShowColumnStats)
```

### MSAModel - Actions

#### action: setBgColor

```js
// type signature
setBgColor: (arg: boolean) => void
```

#### action: setColorSchemeName

pick a scheme from the built-in table, which clears `customColorScheme`

```js
// type signature
setColorSchemeName: (name: string) => void
```

#### action: setCustomColorScheme

color residues from a map of letter to color, or pass undefined to return to
`colorSchemeName`

```js
// type signature
setCustomColorScheme: (map?: Record<string, string> | undefined) => void
```

#### action: setMSAFormat

force a specific MSA parser, or pass undefined to auto-detect

```js
// type signature
setMSAFormat: (arg?: MSAFormat | undefined) => void
```

#### action: setShowColumnStats

```js
// type signature
setShowColumnStats: (arg: boolean) => void
```
