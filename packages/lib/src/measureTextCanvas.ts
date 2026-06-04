import { setFontSize } from './setFontSize.ts'

let canvasHandle: HTMLCanvasElement | undefined

export function measureTextCanvas(text: string, fontSize: number) {
  if (!canvasHandle) {
    canvasHandle = document.createElement('canvas')
  }

  const ctx = canvasHandle.getContext('2d')
  if (!ctx) {
    throw new Error('no canvas context')
  }
  setFontSize(ctx, fontSize)
  return ctx.measureText(text).width
}
