# WebGL/GPU rendering for the MSA canvas

**Closed: measured, and the raster cache already gets us smooth zoom.**

#29 asked to abstract the tree/alignment rendering so a WebGL renderer could
replace Canvas2D later. Filed in 2021 before any of this was measured.

d115164a benchmarked the actual hot loop (headed Chrome, DPR 2, 500px block):
the per-cell `fillRect`+`fillText` loop cost 43ms/block at the letter-visibility
threshold and 885ms/block at `minColWidth` 0.2 — the kind of per-frame cost that
makes zooming feel like it's dragging. A glyph sprite atlas drawn with
`drawImage` per cell, the usual first step toward a GPU path, measured 2-3x
**slower** than `fillText`: Chrome's `fillText` already has a GPU glyph cache,
and a `drawImage` call with a source sub-rect adds more overhead than it saves.

The fix that shipped instead: build the alignment background once as a
zoom-independent 1px/cell raster, cache it in 512-cell tiles, and blit the
covering tiles with `drawImage`. That's ~1ms/block at any zoom level — zoom is
smooth now because the cost no longer scales with column width at all. Letters
still fall back to `fillText`. See `msaRaster.ts` and the commit message on
d115164a for the full numbers.

That leaves no case for WebGL: the one per-cell cost that mattered got fixed on
Canvas2D, jbrowse-components keeps its own sequence display Canvas2D-only, and
the downstream plugin externalizes `@jbrowse/core` against old hosts, so a GPU
path would need a Canvas2D fallback anyway and buys nothing over what's already
there. Reopen if a real workload still shows per-frame cost the raster cache
doesn't cover.
