# GPU-Accelerated Smooth Zooming Plan

## Motivation

The current block-based Canvas 2D architecture renders MSA cells as a grid of
500px canvas tiles. Zooming is discrete (1.5x steps) and each step re-renders
all visible blocks. The goal is smooth, continuous zooming.

## Current Architecture

### Block Rendering

- `MSACanvas.tsx` iterates `blocks2d` (visible tile coordinates) and renders an
  `MSACanvasBlock` per tile
- `MSACanvasBlock.tsx` creates a `<canvas>` element positioned absolutely via
  `style.top = scrollY + offsetY`, `style.left = scrollX + offsetX`
- Each block has a MobX `autorun` that calls `renderMSABlock()` — this fires
  when color scheme, colWidth, rowHeight, etc. change, but NOT on scroll
- Scroll = browser compositor moves existing canvases via CSS. No pixel
  re-rendering. Only blocks entering/leaving the viewport mount/unmount.
- `calculateBlocks.ts` determines which blocks are visible for the current
  viewport and scroll position

### Block System Strengths

- Scroll is essentially free (CSS position changes, compositor-driven)
- Only visible blocks are rendered — tested at 16384x16384 and hundreds of
  thousands of rows/columns
- MobX reactivity is granular: each block's autorun tracks only the data it
  reads
- SVG export works naturally by passing an SvgCanvas context to the same
  render functions
- Canvas 2D works everywhere, no GPU/context issues

### Block System Weakness

Zoom is not smooth. `colWidth` and `rowHeight` change in discrete 1.5x steps.
Each step triggers autorun in every visible block, re-rendering all cells.
There is no interpolation between zoom levels.

## Color Scheme Complexity

Color schemes are the main constraint on any GPU approach. They must NOT be
ported to shaders.

### Static Schemes

Simple `letter -> color` maps (`maeditor`, `clustal`, `lesk`, etc.). Trivial
to handle in any rendering approach.

### Dynamic Schemes

**`clustalx_protein_dynamic`** — color depends on per-column amino acid group
frequencies with ~10 conditional threshold rules. Some rules reference other
groups' frequencies (e.g., Q coloring depends on KR+QE ratio). Computed in
`model.ts` getter `colClustalX`, cached by MobX.

**`percent_identity_dynamic`** — finds consensus letter per column, colors
cells matching consensus with HSL lightness proportional to conservation.
Computed in `model.ts` getter `colConsensus`, cached by MobX.

These are too complex and branchy for GPU shaders, and maintaining them in
TypeScript + WGSL + GLSL would be a maintenance burden. All color logic must
stay in TypeScript.

### Other Rendering Concerns

- `relativeTo` mode shows dots for positions matching a reference sequence and
  mutes their background color
- `contrastLettering` computes black/white text contrast from background colors
- Domain overlays (`renderBoxFeatureCanvasBlock`) draw protein domain boxes
- Insertion indicators draw zigzag markers at insertion positions
- Text rendering (`fillText`) is only shown when `colWidth` is large enough
  for letters to be legible

## Approaches Evaluated

### Approach A: CSS Transform Zoom (Rejected)

Apply `transform: scale()` during zoom gesture, debounce actual re-render.
Rejected because the transforms distort the rendering rather than giving the
correct visual result (cells should change size, not get scaled).

### Approach B: Full Viewport GPU Texture (Rejected)

One GPU canvas covering the viewport. Build a color index texture for all
visible cells, upload, draw with one instanced call. Zoom/pan change uniforms.

**Why rejected:**

1. **Scroll regression.** The current system scrolls by moving CSS-positioned
   canvases — zero pixel re-rendering. This approach rebuilds the entire
   viewport texture on every scroll frame. This is strictly worse for scroll
   performance.

2. **Overscan hitches.** Using an oversized texture to avoid per-frame rebuild
   creates periodic hitches when the scroll position crosses the overscan
   boundary and the full overscan region must be rebuilt.

3. **MobX mismatch.** Requires manually tracking what changed (scroll vs
   scheme vs zoom) to decide whether to rebuild the texture or just update
   uniforms, reimplementing reactivity that MobX already provides.

4. **Full-alignment texture doesn't scale.** A 200K-row x 100K-column
   alignment can't be uploaded as a texture. WebGL2 max texture size is
   4096x4096, WebGPU commonly 8192-16384. Even viewport-sized textures at
   extreme zoom-out on 4K displays push limits.

### Approach C: Continuous Zoom with Existing Blocks (Try First)

Change zoom from discrete 1.5x steps to continuous (wheel delta / pinch
gesture driven). Use `requestAnimationFrame` to animate `colWidth`/`rowHeight`.
The existing autorun in each block fires, re-rendering block content.

**Why this might be sufficient:**

- At default zoom (~160 cols x 67 rows visible), each block covers ~40x30
  cells = ~1200 `fillRect` calls per block, ~6000 total across ~5 blocks.
  Canvas 2D handles tens of thousands of `fillRect` per frame easily.
- `fillText` is slower, but text is already hidden when `colWidth < ~8px`
  (`showMsaLetters` goes false). At low zoom where cell count is highest, text
  isn't drawn.
- Preserves all existing strengths: scroll performance, MobX reactivity, SVG
  export, universal browser support.
- Minimal code change: modify zoom actions to use continuous values instead of
  discrete 1.5x steps.

**This must be profiled.** If block re-rendering during continuous zoom is fast
enough (<16ms for all visible blocks), this is the right answer.

### Approach D: GPU Rolling Texture Atlas (If C Is Insufficient)

If profiling shows block re-rendering is the bottleneck during continuous zoom,
use GPU rendering with a circular-buffer texture that preserves the block
system's scroll efficiency.

## Approach D: Detailed Design

### Core Concept

One GPU canvas covering the viewport. The color index texture is oversized
(2x viewport in each dimension) and treated as a circular buffer. On scroll,
only the newly revealed strip of cells is computed and written. On zoom, the
full texture is rebuilt.

```
+---------------------------------------------+
|              texture atlas                   |
|   +-------------------------------+         |
|   |       visible viewport        |         |
|   |                               |         |
|   +-------------------------------+         |
|                                             |
+---------------------------------------------+

Scroll right: fill rightmost column strip only
Scroll down:  fill bottom row strip only
Zoom:         rebuild entire atlas
```

### Scroll: Incremental Strip Fill

When the visible cell range shifts by N columns or M rows:

1. Compute colors for only the new strip (N columns x visible rows, or
   visible columns x M rows)
2. Write the strip into the texture atlas at the appropriate offset (modular
   arithmetic for circular buffer wraparound)
3. Update uniforms with new scroll offset
4. Draw

Cost is proportional to the strip size, not the viewport size. For typical
per-frame scroll deltas this is a few hundred cells — comparable to the block
system rendering one edge block.

### Zoom: Full Atlas Rebuild

When `colWidth` or `rowHeight` change:

1. Compute new visible cell range + overscan
2. `buildViewportColorIndex(model, colStart, colEnd, rowStart, rowEnd)`
3. Upload full texture
4. Update uniforms
5. Draw

At default zoom this is ~11K cells. At extreme zoom-out on 4K (~3840x2160
cells at colWidth=1) this is ~8.3M cells. The per-cell cost is a typed array
write + color lookup into MobX-cached computed properties — should be <5ms
even for the extreme case.

### Color Index Texture Strategy

Don't store RGBA per cell — store a palette index (one byte per cell):

1. Scan visible cells under current color scheme, collect unique RGBA values
   into a palette (typically 10-20 entries)
2. Build a `Uint8Array` of `(cols x rows)` where each byte is a palette index
3. Upload as an R8 texture (index map) + a small 1D RGBA texture (palette)
4. Shader does: `palette[textureLoad(indexTex, cellCoord).r]`

Memory: 1 byte per cell for index + ~80 bytes for palette. Minimal.

### Shader Design

The shader is intentionally trivial — no color logic, no branching:

```wgsl
struct Uniforms {
  col_width: f32,
  row_height: f32,
  offset_x: f32,       // sub-cell pixel offset
  offset_y: f32,
  viewport_w: f32,
  viewport_h: f32,
  atlas_offset_x: u32, // circular buffer X offset
  atlas_offset_y: u32, // circular buffer Y offset
  atlas_w: u32,
  atlas_h: u32,
}

@vertex fn vs_main(...) -> VertexOut {
  let col = ii % uniforms.num_visible_cols;
  let row = ii / uniforms.num_visible_cols;
  let corner = quad_corner(vi);
  let x = (f32(col) + corner.x) * uniforms.col_width - uniforms.offset_x;
  let y = (f32(row) + corner.y) * uniforms.row_height - uniforms.offset_y;
  out.position = to_clip_space(x, y, uniforms.viewport_w, uniforms.viewport_h);
  // circular buffer lookup coordinates
  out.tex_col = (col + uniforms.atlas_offset_x) % uniforms.atlas_w;
  out.tex_row = (row + uniforms.atlas_offset_y) % uniforms.atlas_h;
  return out;
}

@fragment fn fs_main(in: VertexOut) -> @location(0) vec4f {
  let idx = textureLoad(indexTex, vec2u(in.tex_col, in.tex_row), 0).r;
  return textureLoad(paletteTex, idx, 0);
}
```

GLSL equivalent is equally trivial. Both can be maintained with minimal effort
because there is zero domain logic in the shader. Adding new color schemes
requires zero shader changes.

### Color Index Builder

Single TypeScript function bridges existing model getters to the texture:

```typescript
function buildViewportColorIndex(
  model: MsaViewModel,
  colStart: number, colEnd: number,
  rowStart: number, rowEnd: number,
) {
  const { colorSchemeName, colorScheme, colClustalX, colConsensus,
          columns, leaves, relativeTo } = model
  const width = colEnd - colStart
  const height = rowEnd - rowStart
  const palette: string[] = []
  const paletteMap = new Map<string, number>()
  const data = new Uint8Array(width * height)

  function getOrAddColor(color: string | undefined, fallback: string) {
    const c = color || fallback
    let idx = paletteMap.get(c)
    if (idx === undefined) {
      idx = palette.length
      palette.push(c)
      paletteMap.set(c, idx)
    }
    return idx
  }

  for (let row = 0; row < height; row++) {
    const name = leaves[rowStart + row].data.name
    const seq = columns[name]
    for (let col = 0; col < width; col++) {
      const absCol = colStart + col
      const letter = seq?.[absCol] ?? '-'
      let color: string | undefined
      if (colorSchemeName === 'clustalx_protein_dynamic') {
        color = colClustalX[absCol]?.[letter]
      } else if (colorSchemeName === 'percent_identity_dynamic') {
        const cons = colConsensus[absCol]
        color = cons && letter === cons.letter ? cons.color : undefined
      } else {
        color = colorScheme[letter.toUpperCase()]
      }
      data[row * width + col] = getOrAddColor(color, 'transparent')
    }
  }
  return { data, palette, width, height }
}
```

This is the ONLY place where color scheme logic interfaces with the GPU path.
Everything it calls (`colClustalX`, `colConsensus`, `colorScheme`) already
exists and is MobX-cached.

### Text Overlay

Text is rendered on a separate transparent Canvas 2D overlay (or SVG layer),
only when `colWidth >= ~10px`:

- At that zoom level, visible cell count is small (~200 cols x ~70 rows)
- Standard `fillText` calls on a 2D canvas overlay, same as current code
- Uses existing `contrastScheme` logic
- Positioned over the GPU canvas with `pointer-events: none`

Domain overlays and insertion indicators are also drawn on this overlay canvas.
They are sparse geometry and not performance-critical.

### Text Rendering During Zoom

When zooming through the threshold where text appears/disappears
(`colWidth` crossing ~10px), the text overlay simply mounts/unmounts. The GPU
rects render continuously regardless. This provides a clean visual transition:
colored rects at all zoom levels, letters fade in when large enough to read.

### Fallback

The existing `MSACanvas` + `MSACanvasBlock` code stays untouched as the
Canvas 2D fallback:

```tsx
function MSAPanel({ model }) {
  if (model.gpuRenderer) {
    return <MSAGpuCanvas model={model} />
  }
  return <MSACanvas model={model} />
}
```

No shared "renderer interface." Two separate code paths. The fallback IS the
current proven code.

SVG export always routes through the Canvas 2D fallback path.

### HAL Dependency

The `GpuHal` interface from `jbrowse-components` (`packages/core/src/gpu/hal/`)
provides the WebGPU -> WebGL2 fallback chain:

- `createGpuHal(canvas, passes, uniformByteSize)` — tries WebGPU, falls back
  to WebGL2, returns null if neither available
- `uploadTexture(passId, data, width, height)` — index texture upload
- `writeUniforms(data)` — scroll/zoom uniform updates
- `drawPass(passId, regionKey)` — single instanced draw call
- `resize(width, height)` — viewport resize with device pixel ratio

Context loss recovery is handled by `useGpuRenderer` hook.

### New Files

| File | ~Lines | Purpose |
|---|---|---|
| `buildViewportColorIndex.ts` | ~100 | Model + visible range -> palette index texture |
| `msaShaders.ts` | ~80 | WGSL + GLSL (trivial rect + texture lookup) |
| `MsaGpuRenderer.ts` | ~180 | HAL wrapper, rolling atlas management, strip fill |
| `MSAGpuCanvas.tsx` | ~200 | React component, text overlay, mouse, scroll/zoom |
| Edits to existing | ~20 | Conditional GPU vs fallback |

~580 lines of new code. Shader contains zero domain logic.

## Comparison

| Property | Current blocks | Approach C (continuous zoom) | Approach D (GPU rolling atlas) |
|---|---|---|---|
| Scroll perf | Excellent (CSS) | Excellent (CSS) | Good (strip fill) |
| Zoom perf | Poor (discrete, full re-render) | Good if blocks fast enough | Excellent (uniform + rebuild) |
| Large alignments | Excellent (viewport-only) | Excellent (viewport-only) | Excellent (viewport-only) |
| SVG export | Native | Native | Via Canvas 2D fallback |
| Browser compat | Universal | Universal | WebGL2 required (Canvas 2D fallback) |
| MobX integration | Excellent | Excellent | Medium (manual scroll tracking) |
| Code complexity | Low | Low | Medium |
| Maintenance | Low | Low | Medium (two render paths) |

## Recommended Sequence

1. **Profile first.** Instrument continuous zoom with the existing block system
   (Approach C). Measure frame times during zoom at various alignment sizes
   and zoom levels. The key question: can all visible blocks re-render within
   16ms during a continuous zoom gesture?

2. **If yes:** ship continuous zoom. Minimal code change, no new dependencies,
   no new failure modes.

3. **If no:** implement Approach D (GPU rolling atlas). The profiling data will
   tell you exactly which zoom levels and alignment sizes are too slow, which
   informs the overscan sizing and whether the text overlay threshold needs
   adjustment.

4. **Don't skip profiling.** The GPU approach adds real complexity (two render
   paths, context loss handling, HAL dependency, circular buffer math). It's
   only justified if the Canvas 2D path demonstrably can't keep up.
