---
id: dialogqueuesessionmixin
title: DialogQueueSessionMixin
---

Note: this document is automatically generated from @jbrowse/mobx-state-tree
objects in our source code.

## Links

- [Source code](https://github.com/GMOD/JBrowseMSA/blob/main/packages/lib/src/model/DialogQueue.ts)
- [Embedding guide](https://gmod.org/JBrowseMSA/embedding) — how to use this
  model in React, HTML, and R
- [User guide](https://gmod.org/JBrowseMSA/guide) — a tour of the viewer

## Overview

### DialogQueueSessionMixin - Getters

#### getter: DialogComponent

```js
DialogComponent: DialogComponentType
```

#### getter: DialogProps

```js
DialogProps: Record<string, unknown>
```

### DialogQueueSessionMixin - Actions

#### action: queueDialog

```js
queueDialog: <T extends DialogComponentType>(cb: (doneCallback: () => void) => [T, ComponentProps<T>]) => void
```

#### action: removeActiveDialog

```js
removeActiveDialog: () => void
```
