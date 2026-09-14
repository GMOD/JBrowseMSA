# react-msaview examples

The live examples behind the website's
[examples page](https://gmod.org/JBrowseMSA/examples): each one a small
component that renders the viewer, shown beside its own source. This package is
not an app — the website imports `src/ExampleBrowser.tsx` and mounts it there.

`src/examples/catalog.ts` is the list. It carries what each example is, in the
words the examples page prints and the
[gallery](https://gmod.org/JBrowseMSA/gallery) captions, so a story is written
once and cannot drift between the two pages.

`data/` holds the alignments, trees and annotation files the examples import
with Vite's `?raw`. They are files, not string constants: the same bytes feed
the live examples, the screenshot specs, the SVG figures, and — copied by
`scripts/screenshots/writeExampleData.mjs` — the demo app's `?data=` deep links.
`scripts/examples-gen/README.md` says where each one comes from and how to
rebuild it.

## Adding an example

1. Write `src/examples/MyExample.tsx` with a default-exported component.
2. Add an entry to `src/examples/catalog.ts` (its `id` is the component's
   filename) and register the component in `src/examples/index.ts`.
3. A gallery figure is optional: add `figures: [{ src, title, caption }]` to the
   catalog entry, plus a spec of the same name in
   `scripts/screenshots/specs.mjs`, then `pnpm screenshots --filter=<src>`.
