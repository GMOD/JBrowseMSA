let canvasHandle: HTMLCanvasElement | undefined

export function measureTextCanvas(text: string, fontSize: number) {
  if (!canvasHandle) {
    canvasHandle = document.createElement('canvas')
  }

  const ctx = canvasHandle.getContext('2d')
  if (!ctx) {
    throw new Error('no canvas context')
  }
  ctx.font = ctx.font.replace(/\d+px/, `${fontSize}px`)
  return ctx.measureText(text).width
}
