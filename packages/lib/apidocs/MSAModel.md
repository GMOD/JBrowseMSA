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

#### property: bgColor

draw MSA tiles with a background color

```js
bgColor: stripDefault(types.boolean, defaultBgColor)
```

#### property: colorSchemeName

default color scheme name

```js
colorSchemeName: stripDefault(types.string, defaultColorSchemeName)
```

#### property: customColorScheme

a color per residue letter, which replaces the `colorSchemeName` table while
set. A letter the map leaves out takes no color

```js
customColorScheme: types.frozen<Record<string, string> | undefined>()
```

#### property: msaFormat

force the MSA data to be parsed as a specific format instead of relying on
auto-detection (which is ambiguous between e.g. fasta and a3m)

```js
msaFormat: types.maybe(
  types.enumeration < MSAFormat > ('MSAFormat', msaFormats),
)
```

#### property: showColumnStats

show a tooltip with the hovered column's value for a track while hovering that
track: the conservation scores, the logo's composition, an arc's partner columns

```js
showColumnStats: stripDefault(types.boolean, defaultShowColumnStats)
```

### MSAModel - Actions

#### action: setBgColor

```js
setBgColor: (arg: boolean) => void
```

#### action: setColorSchemeName

pick a scheme from the built-in table, which clears `customColorScheme`

```js
setColorSchemeName: (name: string) => void
```

#### action: setCustomColorScheme

color residues from a map of letter to color, or pass undefined to return to
`colorSchemeName`

```js
setCustomColorScheme: (map?: Record<string, string> | undefined) => void
```

#### action: setMSAFormat

force a specific MSA parser, or pass undefined to auto-detect

```js
setMSAFormat: (arg?: MSAFormat | undefined) => void
```

#### action: setShowColumnStats

```js
setShowColumnStats: (arg: boolean) => void
```
