# react-msaview examples

The live examples behind the website's
[examples page](https://gmod.org/JBrowseMSA/examples): each one a small
component that renders the viewer, shown beside its own source. The package has
no app of its own; the website imports `src/ExampleBrowser.tsx` and mounts it.

`src/examples/catalog.ts` is the list: the name, category and blurb the examples
page prints for each entry.

`data/` holds the alignments, trees and annotation files the examples import
with Vite's `?raw`. The same bytes feed the live examples, the screenshot specs
and the SVG figures, and `scripts/screenshots/writeExampleData.mjs` copies them
into the demo app for its `#data=` deep links. `scripts/examples-gen/README.md`
says where each file comes from and how to rebuild it.

## Adding an example

1. Write `src/examples/MyExample.tsx` with a default-exported component.
2. Add an entry to `src/examples/catalog.ts` (its `id` is the component's
   filename) and register the component in `src/examples/index.ts`.
