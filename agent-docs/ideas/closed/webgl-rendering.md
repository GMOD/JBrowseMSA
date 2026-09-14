# WebGL/GPU rendering for the MSA canvas

**Closed: measured, and the raster cache already makes zoom smooth.**

#29, filed in 2021 before any of this was measured, asked to abstract the
tree/alignment rendering so a WebGL renderer could replace Canvas2D later.

d115164a benchmarked the hot loop (headed Chrome, DPR 2, 500px block): the
per-cell `fillRect`+`fillText` loop cost 43ms/block at the letter-visibility
threshold and 885ms/block at `minColWidth` 0.2, slow enough to make zooming lag.
A glyph sprite atlas drawn with `drawImage` per cell, the usual first step toward
a GPU path, measured 2-3x **slower** than `fillText`: Chrome's `fillText`
already has a GPU glyph cache, and a `drawImage` call with a source sub-rect adds
more overhead than it saves.

We shipped a raster instead: the viewer builds the alignment background once as
a zoom-independent 1px/cell raster, caches it in 512-cell tiles, and blits the
covering tiles with `drawImage`. That costs ~1ms/block at any zoom level, because
the cost no longer scales with column width. Letters still use `fillText`. See
`msaRaster.ts` and the commit message on d115164a for the full numbers.

WebGL has no remaining case. The one per-cell cost that mattered is fixed on
Canvas2D, jbrowse-components keeps its own sequence display Canvas2D-only, and
the downstream plugin externalizes `@jbrowse/core` against old hosts, so a GPU
path would need a Canvas2D fallback anyway and would gain nothing over the
raster. Reopen if a real workload still shows a per-frame cost the raster cache
does not cover.
