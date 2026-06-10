This folder contains scripts to auto-generate state model API docs from JSDoc
comments in `src/`. Generated output goes to `apidocs/`.

Run from `packages/lib`:

```
pnpm statedocs
```

## Authoring tags

Mark declarations with JSDoc tags. One `#stateModel` per file.

```
#stateModel ModelName   — factory function or const for the model
#property               — types.model property
#volatile               — volatile (runtime-only) property
#getter                 — computed view getter
#method                 — view that takes arguments
#action                 — action
```

Optionally add `#example` blocks at the end of a JSDoc comment:

```js
/**
 * #stateModel MsaView
 * #example minimal
 * ```js
 * const model = stateModelFactory()
 * ```
 */
```

## Composition graph

The generator derives model composition automatically from `types.compose(...)`
calls in the source — no need to maintain a manual `extends` list. The
"Inherited members" section in each generated doc reflects what is composed in
code.
