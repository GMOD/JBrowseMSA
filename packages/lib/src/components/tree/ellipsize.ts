const ellipsis = '…'

function cutMiddle(text: string, kept: number) {
  const head = Math.ceil(kept / 2)
  return (
    text.slice(0, head).trimEnd() +
    ellipsis +
    text.slice(text.length - (kept - head)).trimStart()
  )
}

/**
 * `text` with its middle replaced by an ellipsis, keeping as many characters
 * from both ends as measure at most `room` px, so a trailing species or gene
 * suffix survives the cut
 */
export function ellipsize(
  measure: (text: string) => number,
  text: string,
  room: number,
) {
  const width = measure(text)
  if (width <= room) {
    return { text, width }
  }
  for (let n = Math.floor((text.length * room) / width); n > 0; n--) {
    const truncated = cutMiddle(text, n)
    const truncatedWidth = measure(truncated)
    if (truncatedWidth <= room) {
      return { text: truncated, width: truncatedWidth }
    }
  }
  return { text: '', width: 0 }
}
