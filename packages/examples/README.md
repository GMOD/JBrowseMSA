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

- Write `src/examples/MyExample.tsx` with a default-exported component. A
  capitalized filename marks it as an example; `index.ts` finds it with
  `import.meta.glob`.
- Add an entry to `src/examples/catalog.ts` whose `id` is the filename.
- Prefer a new option in an existing demo (the families pickers, the model API
  controls) over a new entry when the demo differs only in its data.
