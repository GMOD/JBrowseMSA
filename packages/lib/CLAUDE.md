Background on every subsystem below:
`agent-docs/reference/viewer-architecture.md`.

- **Grep ggmsaview's `js/bridge.ts` (`~/src/ggmsaview`) before renaming an
  export.** It imports `packages/lib/src` by path, so a rename passes every
  check here and breaks ggmsaview's next build.
- **Keep an MST property's name when its public name changes**
  (`showDomainLegend`), or read the old key in `preProcessSnapshot` the way
  `liftResidueColor` does. Property names travel in shared URLs and snapshots,
  and MST drops an unknown key without a word.
- **A spelling change to a channel rewrites every producer in the same change**:
  tutorials, screenshot specs, `packages/app/public/data`, ggmsaview. No reader
  is kept for an earlier spelling.
- Read `effectiveTreeAreaWidth` and `effectiveTreeWidth`; `treeAreaWidth` and
  `treeWidth` are undefined until something sets them.
- Test for a per-column scheme with `dynamicColorSchemeName`; the `residueColor`
  scheme stays set while a `domain` on its scale wins over it.
- A new input to a cell's color goes into `msaRaster.ts`'s cache key, or the
  tiles keep the old color.
- A new property holding tree node ids gets cleared in `clearNodeState`: the ids
  are path-derived from the rerooted tree, so a reroot invalidates them.
- Portal anything `position: fixed` inside `MSACanvas`, `TreeCanvas` or
  `TrackBlocks`; their transformed containers become its containing block.
- Use long-established `@jbrowse/core` exports and inline a trivial new one.
  jbrowse-plugin-msaview resolves core against the host's older copy, so a new
  export passes here and fails there.
- Keep domain visualization (the GFF path, overlay, legend, filter dialog); it
  is a core feature.
- `model.ts` keeps its properties, views and actions inline; a function that
  never reads `self` goes in a module beside it.
- Name new public API in jbrowse-components' `LinearMarkDisplay` vocabulary:
  marks, encodings, channels, scales.
