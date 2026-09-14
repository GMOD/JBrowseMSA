The scripts in `docgen/` generate the state model API docs in `apidocs/` from
JSDoc comments in `src/`.

Run from `packages/lib`:

```
pnpm statedocs
```

## Authoring tags

Mark declarations with JSDoc tags. One `#stateModel` per file.

```
#stateModel ModelName   factory function or const for the model
#property               types.model property
#volatile               volatile (runtime-only) property
#getter                 computed view getter
#method                 view that takes arguments
#action                 action
```

Optionally add `#example` blocks at the end of a JSDoc comment:

````js
/**
 * #stateModel MsaView
 * #example minimal
 * ```js
 * const model = stateModelFactory()
 * ```
 */
````

## Composition graph

The generator reads model composition from the `types.compose(...)` calls in the
source, so there is no `extends` list to maintain. The "Inherited members"
section in each generated doc lists what the code composes.
