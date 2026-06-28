/**
 * The subset of the canvas 2D API that the block renderers use. Both a real
 * `CanvasRenderingContext2D` and the `@jbrowse/svgcanvas` `Context` (used for
 * SVG export) satisfy this, so renderers can be typed against it without an
 * `as any` cast at the SVG-export boundary.
 */
export type RenderCtx = Pick<
  CanvasRenderingContext2D,
  | 'arc'
  | 'beginPath'
  | 'clearRect'
  | 'closePath'
  | 'fill'
  | 'fillRect'
  | 'fillStyle'
  | 'fillText'
  | 'font'
  | 'lineTo'
  | 'lineWidth'
  | 'measureText'
  | 'moveTo'
  | 'resetTransform'
  | 'scale'
  | 'setLineDash'
  | 'stroke'
  | 'strokeRect'
  | 'strokeStyle'
  | 'textAlign'
  | 'textBaseline'
  | 'translate'
>
