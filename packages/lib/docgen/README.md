The scripts in `docgen/` generate the state model API docs in `apidocs/` from
JSDoc comments in `src/`.

Run from `packages/lib`:

```
pnpm statedocs
```

## Authoring tags

Mark declarations with JSDoc tags. A tag counts only where it starts its line,
so prose can mention `#getter` without making one. One `#stateModel` per file,
and a second one throws.

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

## What a member renders as

A property or volatile shows the source line that declares it, such as
`allowedGappyness: stripDefault(types.number, defaultAllowedGappyness)`. The
checker's type for it, `IOptionalIType<ISimpleType<number>, [undefined]>`, says
less, and a filehandle's type changed whenever `@jbrowse/core` did, which failed
the CI freshness check with no source change here.

Getters, methods and actions show their type signature. `elideSignature` in
`util.ts` shortens a signature longer than 180 characters by collapsing generic
arguments and object types from the inside out, where the checker's own limit
cut it mid-token. The generator sorts runs of string literals in a union,
because the checker prints them in whatever order the program met them.

The approach follows the jbrowse-components generator in
`website/scripts/api-docs`.
