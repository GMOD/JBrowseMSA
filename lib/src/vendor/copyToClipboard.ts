/**
 * Copy text to clipboard utility.
 * Uses modern Clipboard API with fallback to execCommand.
 */

function deselectCurrent() {
  const selection = document.getSelection()
  if (!selection || !selection.rangeCount) {
    return () => {}
  }
  const active = document.activeElement as HTMLElement | null

  const ranges: Range[] = []
  for (let i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i))
  }

  const tagName = active?.tagName.toUpperCase()
  if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
    active?.blur()
  }

  selection.removeAllRanges()
  return () => {
    if (selection.type === 'Caret') {
      selection.removeAllRanges()
    }
    if (!selection.rangeCount) {
      for (const range of ranges) {
        selection.addRange(range)
      }
    }
    active?.focus()
  }
}

export interface CopyOptions {
  debug?: boolean
  format?: string
  onCopy?: (clipboardData: DataTransfer) => void
}

export default function copy(text: string, options?: CopyOptions): boolean {
  const debug = options?.debug || false
  let success = false
  let reselectPrevious: (() => void) | undefined
  let range: Range | undefined
  let selection: Selection | null = null
  let mark: HTMLSpanElement | undefined

  try {
    reselectPrevious = deselectCurrent()
    range = document.createRange()
    selection = document.getSelection()

    mark = document.createElement('span')
    mark.textContent = text
    mark.ariaHidden = 'true'
    mark.style.all = 'unset'
    mark.style.position = 'fixed'
    mark.style.top = '0'
    mark.style.clip = 'rect(0, 0, 0, 0)'
    mark.style.whiteSpace = 'pre'
    mark.style.webkitUserSelect = 'text'
    ;(mark.style as unknown as Record<string, string>).MozUserSelect = 'text'
    ;(mark.style as unknown as Record<string, string>).msUserSelect = 'text'
    mark.style.userSelect = 'text'

    mark.addEventListener('copy', e => {
      e.stopPropagation()
      if (options?.format) {
        e.preventDefault()
        if (e.clipboardData) {
          e.clipboardData.clearData()
          e.clipboardData.setData(options.format, text)
        }
      }
      if (options?.onCopy && e.clipboardData) {
        e.preventDefault()
        options.onCopy(e.clipboardData)
      }
    })

    document.body.appendChild(mark)
    range.selectNodeContents(mark)
    selection?.addRange(range)

    const successful = document.execCommand('copy')
    if (!successful) {
      throw new Error('copy command was unsuccessful')
    }
    success = true
  } catch (err) {
    if (debug) {
      console.error('unable to copy using execCommand: ', err)
    }
    try {
      const clipboardData = (window as unknown as Record<string, DataTransfer>)
        .clipboardData
      if (clipboardData) {
        clipboardData.setData(options?.format || 'text', text)
        options?.onCopy?.(clipboardData)
        success = true
      }
    } catch (err2) {
      if (debug) {
        console.error('unable to copy using clipboardData: ', err2)
      }
    }
  } finally {
    if (selection) {
      if (typeof selection.removeRange === 'function' && range) {
        selection.removeRange(range)
      } else {
        selection.removeAllRanges()
      }
    }
    if (mark) {
      document.body.removeChild(mark)
    }
    reselectPrevious?.()
  }

  return success
}
